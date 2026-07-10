# WenzaPay Architecture Blueprint

This document serves as the single source of truth for all components of WenzaPay — a non-custodial stablecoin payment orchestration SaaS for high-risk merchants. 

## 1. Monorepo Layout

We use Turborepo to manage our packages and applications.

```
wenzapay/
├── apps/
│   ├── web/                        # Next.js 15 App Router — merchant dashboard + API
│   └── widget/                     # Vite standalone bundle — CDN hosted checkout widget
├── services/
│   └── listener/                   # Persistent Node.js process — blockchain listener
├── packages/
│   ├── shared/                     # Shared types, zod schemas, utility functions
│   └── risk-engine/                # Standalone ML-informed risk scoring package
├── supabase/
│   ├── migrations/                 # PostgreSQL DB schema migrations
│   └── seed.sql                    # Seed data
├── infra/
│   ├── docker-compose.yml          # Local dev environment
│   └── fly.toml                    # Listener service deployment
├── turbo.json                      # Turborepo build pipelines
└── package.json                    # Root workspace using pnpm
```

## 2. Database Schema (Supabase / PostgreSQL)

```sql
-- Merchants
create table merchants (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  business_name text not null,
  website      text,
  category     text,
  status       text default 'pending',
  master_wallet_sol text,
  master_wallet_evm text,
  created_at   timestamptz default now()
);

-- API Keys
create table api_keys (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid references merchants(id) on delete cascade,
  key_hash     text unique not null,
  prefix       text not null,
  name         text,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz default now()
);

-- Payment Sessions
create table payments (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid references merchants(id),
  external_ref    text,
  amount_usd      numeric(18,6) not null,
  amount_crypto   numeric(18,18),
  token           text,
  chain           text,
  stealth_address text unique not null,
  status          text default 'pending',
  risk_score      integer,
  tx_hash         text,
  confirmed_at    timestamptz,
  swept_at        timestamptz,
  created_at      timestamptz default now()
);

-- Immutable Ledger
create table ledger_events (
  id           bigserial primary key,
  payment_id   uuid references payments(id),
  merchant_id  uuid references merchants(id),
  event_type   text not null,
  metadata     jsonb,
  created_at   timestamptz default now()
);

-- Webhooks
create table webhook_endpoints (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid references merchants(id) on delete cascade,
  url          text not null,
  secret_hash  text not null,
  events       text[],
  enabled      boolean default true,
  created_at   timestamptz default now()
);

create table webhook_deliveries (
  id           uuid primary key default gen_random_uuid(),
  endpoint_id  uuid references webhook_endpoints(id),
  payment_id   uuid references payments(id),
  event_type   text not null,
  payload      jsonb not null,
  status       text default 'pending',
  attempts     integer default 0,
  next_retry   timestamptz,
  delivered_at timestamptz,
  created_at   timestamptz default now()
);

-- Risk Events
create table risk_events (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid references payments(id),
  score        integer not null,
  signals      jsonb,
  action       text,
  created_at   timestamptz default now()
);

-- Subscriptions
create table subscriptions (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid references merchants(id),
  customer_wallet text not null,
  plan_id         text not null,
  amount_usd      numeric(18,6) not null,
  interval        text not null,
  chain           text not null,
  delegation_sig  text,
  status          text default 'active',
  next_billing    timestamptz,
  created_at      timestamptz default now()
);

-- RLS Policies
alter table merchants enable row level security;
alter table api_keys enable row level security;
alter table payments enable row level security;
alter table webhook_endpoints enable row level security;
alter table webhook_deliveries enable row level security;
alter table risk_events enable row level security;

create policy "merchants can read own ledger"
  on ledger_events for select
  using (merchant_id = auth.uid());
```

## 3. Service Communication Map

```text
Browser (Merchant Dashboard)
        │  HTTPS
        ▼
┌───────────────────┐
│  Next.js Web App  │◄──── Supabase Auth (JWT)
│  (Vercel)         │
│                   │──── Supabase DB (reads/writes)
│  /api/payments    │──── Upstash Redis (webhook queue publish)
│  /api/keys        │
│  /api/webhooks    │
└───────────────────┘
        ▲
        │ Supabase real-time
        │ (dashboard live updates)

Customer Browser (Checkout)
        │  CDN script tag
        ▼
┌───────────────────┐
│  Widget Bundle    │──── Polls /api/payments/:id/status
│  (CDN hosted)     │
└───────────────────┘

┌────────────────────────────────┐
│  Blockchain Listener Service   │  ← Separate persistent process (Fly.io)
│  (Node.js)                     │
│                                │
│  Solana WS ──► address monitor │
│  Tron poll ──► address monitor │──► Supabase (update payment status)
│  Polygon  ──► address monitor  │──► Upstash Redis (enqueue webhook)
│                                │──► Sweep to master wallet
└────────────────────────────────┘
        ▲
        │ reads pending payment addresses
        │ from Supabase on startup + real-time

┌────────────────────────────────┐
│  Webhook Worker                │  ← Upstash QStash consumer
│  (Vercel Edge Function)        │
│                                │──► POST to merchant endpoint
│  Retry: 0m → 5m → 30m → 2h   │──► Log delivery to webhook_deliveries
│  → 24h                         │
└────────────────────────────────┘

┌────────────────────────────────┐
│  DEX Swap Service              │  ← Called by Listener on non-USDC payment
│  Jupiter (Solana)              │
│  1inch (EVM)                   │──► Swap incoming token → USDC
└────────────────────────────────┘
```

## 4. API Contract

**`POST /api/payments/create`**
- **Auth**: `Bearer <API_KEY>`
- **Request**: `{ amount: number, chain: 'solana' | 'tron' | 'polygon', ref: string, fingerprintData: any }`
- **Response**: `{ id: string, stealth_address: string, status: string, amount_crypto: string, token: string }`

**`GET /api/payments/:id/status`**
- **Auth**: None (Public for widget)
- **Response**: `{ status: 'pending' | 'confirmed' | 'failed' | 'swap_failed' }`

**`GET /api/keys`**
- **Auth**: Session Cookie
- **Response**: `[{ id: string, name: string, prefix: string, created_at: string, last_used_at: string }]`

**`POST /api/webhooks/endpoints`**
- **Auth**: Session Cookie
- **Request**: `{ url: string, events: string[] }`
- **Response**: `{ id: string, secret: string }`

## 5. Environment Variables

**apps/web (.env)**
- `NEXT_PUBLIC_SUPABASE_URL` (Public) - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Public) - Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY` (Secret) - Supabase Admin Key
- `UPSTASH_REDIS_REST_URL` (Secret) - Upstash connection
- `UPSTASH_REDIS_REST_TOKEN` (Secret) - Upstash token
- `WENZAPAY_XPUB_ENCRYPTION_KEY` (Secret) - AES-256 key for xpub

**services/listener (.env)**
- `SUPABASE_URL` (Secret)
- `SUPABASE_SERVICE_ROLE_KEY` (Secret)
- `HELIUS_RPC_URL` (Secret) - Solana WebSocket RPC
- `TRONGRID_API_KEY` (Secret) - Tron polling API key
- `ALCHEMY_API_KEY` (Secret) - Polygon EVM API key
- `WEBHOOK_WORKER_URL` (Public)

**apps/widget (.env)**
- `VITE_API_BASE_URL` (Public) - URL pointing to the Next.js API

## 6. Tech Stack Decisions

- **Framework**: Next.js 15 App Router. *Reason: Modern React ecosystem with built-in API routes suitable for dashboards.*
- **Database**: Supabase (PostgreSQL). *Reason: Real-time subscriptions are critical for the dashboard, and RLS secures the ledger natively.*
- **Queue**: Upstash QStash / Redis. *Reason: Next.js background tasks time out, QStash reliably delivers to Vercel Edge functions.*
- **Widget**: Vite IIFE bundle. *Reason: The widget must be a single dependency-free JS file for drop-in CDN embedding.*
- **Listener**: Node.js on Fly.io. *Reason: WebSockets for Solana require a long-lived persistent connection, which serverless environments (Vercel) terminate.*

## 7. Critical Implementation Rules

1. **Rule 1**: The blockchain listener is ALWAYS a separate persistent Node.js process in `services/listener/`. Never put blockchain monitoring code inside Next.js API routes.
2. **Rule 2**: Never store raw API keys. Hash with SHA-256 before DB insert. Return the raw key once (at creation) and discard.
3. **Rule 3**: Stealth addresses are derived from merchant `xpub` via BIP32. `paymentIndex` increments atomically per merchant. Never reuse an index.
4. **Rule 4**: The `ledger_events` table is append-only. No UPDATE or DELETE ever.
5. **Rule 5**: All monetary amounts stored as `numeric(18,6)` in the DB — never as floats. Never use JavaScript float arithmetic for amounts.
6. **Rule 6**: Supabase client in server components uses the service role key. Supabase client in browser uses the anon key.
7. **Rule 7**: Every payment risk score must be computed and stored before the payment address is returned to the widget. Risk is a gate, not a log.
8. **Rule 8**: Use `pnpm` throughout. Never `npm install`. Never commit `node_modules`.
