-- Merchants
create table merchants (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  business_name text not null,
  website      text,
  category     text,                    -- 'nsfw' | 'gaming' | 'crypto' | 'other'
  status       text default 'pending',  -- 'pending' | 'active' | 'suspended'
  master_wallet_sol text,
  master_wallet_evm text,
  created_at   timestamptz default now()
);

-- API Keys
create table api_keys (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid references merchants(id) on delete cascade,
  key_hash     text unique not null,    -- hashed — never store raw
  prefix       text not null,           -- 'wpay_live_' | 'wpay_test_'
  name         text,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz default now()
);

-- Payment Sessions
create table payments (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid references merchants(id),
  external_ref    text,                  -- merchant's own order ID
  amount_usd      numeric(18,6) not null,
  amount_crypto   numeric(18,18),
  token           text,                  -- 'USDC' | 'USDT' | 'SOL' etc.
  chain           text,                  -- 'solana' | 'tron' | 'polygon'
  stealth_address text unique not null,  -- one-time address
  status          text default 'pending',-- 'pending'|'confirmed'|'failed'|'swept'
  risk_score      integer,
  tx_hash         text,
  confirmed_at    timestamptz,
  swept_at        timestamptz,
  created_at      timestamptz default now()
);

-- Immutable Ledger (append-only — no UPDATE or DELETE via RLS)
create table ledger_events (
  id           bigserial primary key,
  payment_id   uuid references payments(id),
  merchant_id  uuid references merchants(id),
  event_type   text not null,   -- 'payment.created'|'payment.confirmed'|'sweep.completed' etc.
  metadata     jsonb,
  created_at   timestamptz default now()
);

-- Webhooks
create table webhook_endpoints (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid references merchants(id) on delete cascade,
  url          text not null,
  secret_hash  text not null,
  events       text[],          -- subscribed event types
  enabled      boolean default true,
  created_at   timestamptz default now()
);

create table webhook_deliveries (
  id           uuid primary key default gen_random_uuid(),
  endpoint_id  uuid references webhook_endpoints(id),
  payment_id   uuid references payments(id),
  event_type   text not null,
  payload      jsonb not null,
  status       text default 'pending', -- 'pending'|'delivered'|'failed'
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
  signals      jsonb,           -- device fingerprint, velocity, wallet score
  action       text,            -- 'allow'|'review'|'block'|'hold'
  created_at   timestamptz default now()
);

-- Subscriptions (Phase 4)
create table subscriptions (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid references merchants(id),
  customer_wallet text not null,
  plan_id         text not null,
  amount_usd      numeric(18,6) not null,
  interval        text not null,  -- 'weekly'|'monthly'|'annual'
  chain           text not null,
  delegation_sig  text,           -- on-chain approval signature
  status          text default 'active',
  next_billing    timestamptz,
  created_at      timestamptz default now()
);

-- RLS Policies
alter table merchants         enable row level security;
alter table api_keys          enable row level security;
alter table payments          enable row level security;
alter table webhook_endpoints enable row level security;
alter table webhook_deliveries enable row level security;
alter table risk_events       enable row level security;

-- Ledger is read-only for merchants — no delete, no update
create policy "merchants can read own ledger"
  on ledger_events for select
  using (merchant_id = auth.uid());
