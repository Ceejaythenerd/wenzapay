# WenzaPay Project Handover

Welcome back! This document summarizes the current state of the WenzaPay project — what's built, the recent architectural audits, how the codebase is organized, and what we need to focus on next.

---

## Current State

**The core MVP is structurally, visually, and securely complete.** 
We have recently concluded a massive, multi-phase system audit that remediated 23 critical vulnerabilities, code quality issues, and architecture gaps. The push payment gateway, recurring subscription engine, fiat off-ramping, compliance toolkit, and a fully polished marketing site are fully implemented and type-safe.

### What's Built So Far

| Feature | Location | Maturity |
|---|---|---|
| **Marketing Site** | `apps/web/app/(public)/` — Premium pages with shared Layout | Implemented |
| **Merchant Auth & Onboarding** | `apps/web/app/(auth)/` — login, signup, multi-step wizard | Implemented |
| **Merchant Dashboard** | `apps/web/app/dashboard/` — **Bento Box UI**, glassmorphism, env toggle | Implemented |
| **Checkout Widget** | `apps/widget/` — 4-step flow, shadow DOM, IIFE bundle | Implemented |
| **Blockchain Listener** | `services/listener/` — Solana WS, Polygon events, Tron polling. | Implemented (Strict Typed) |
| **Risk Engine** | `packages/risk-engine/` — fingerprint, velocity, wallet scoring, OFAC | Implemented |
| **Webhook System** | `apps/web/app/api/webhooks/` — endpoints, deliveries | Implemented |
| **Sandbox Mode** | `apps/web/lib/sandbox.ts` — test keys, fake payments, auto-confirm | Implemented |
| **Stealth Addresses** | `packages/shared/src/utils/stealth.ts` | Implemented (`viem` spec) |
| **Subscription Engine** | `services/listener/src/billing.ts` + `/api/subscriptions/` | Implemented (Cron ready) |
| **Fiat Off-Ramp** | `services/listener/src/settlement.ts` | Implemented |

---

## Recent Accomplishments (Comprehensive Audit)

We completed a 4-phase, 23-item system audit involving multiple AI sub-agents. Key achievements include:

### 1. Security Hardening
- Encrypted custodial private keys using AES-GCM and a secure `WENZAPAY_XPUB_ENCRYPTION_KEY`.
- Rotated leaked `SUPABASE_SERVICE_ROLE_KEY` from Git history.
- Enforced server-side only Supabase clients (`@supabase/ssr`) in all Next.js API routes.
- Applied rigorous API key pepper hashing.

### 2. Database & Schema Migrations
- Executed strict Row Level Security (RLS) policies for `subscriptions`, `api_keys`, and `merchants`.
- Added critical missing columns (`failure_count`, `derivation_path`) to support edge cases.
- Implemented `pg_cron` jobs for auto-expiring stagnant pending payments.

### 3. Architecture & Functional Fixes
- Upgraded the Dashboard UI to a stunning modern Bento Box layout with glassmorphism.
- Replaced pervasive `any` types with strict TypeScript interfaces across the `services/listener` and Next.js APIs.
- Fixed stealth address derivation logic using standard `viem` cryptographic utilities.
- Cleaned the repository of dead files (`memo.ts`, `merge_sql.js`) and optimized `.gitignore` for `.turbo` caches.

---

## Codebase Overview (Monorepo)

The project uses **Turborepo** with `pnpm` workspaces.

### Full Directory Tree

```text
wenzapay/
├── .env.example                        # Root env template (all services)
├── turbo.json                          # Turborepo pipeline config
├── pnpm-workspace.yaml                 # Workspace packages
├── package.json                        # Root workspace
│
├── apps/
│   ├── web/                            # Next.js 15 App Router
│   │   ├── app/
│   │   │   ├── (auth)/                 # Auth route group
│   │   │   ├── dashboard/              # Protected dashboard routes (Bento UI)
│   │   │   ├── (public)/               # Marketing Site, Docs, and Portals
│   │   │   └── api/                    # Server-side API handlers
│   │   └── components/                 # Shared UI and Layouts
│   │
│   └── widget/                         # Vite standalone checkout widget
│
├── packages/
│   ├── shared/                         # Shared types, stealth derivation, crypto utils
│   ├── risk-engine/                    # Standalone risk scoring package
│   └── e2e-tests/                      # Playwright E2E tests
│
├── services/
│   └── listener/                       # Persistent Node.js blockchain listener
│
├── infra/                              # Deployment configs (fly.toml, docker-compose.yml)
├── supabase/
│   └── migrations/                     # SQL Schema definitions & RLS
```

---

## Next Steps: Deployment & CI/CD

Now that the codebase is 100% audited, type-safe, and successfully pushed to GitHub, our primary focus shifts to Go-Live and maintenance.

### 1. Production Deployment
Review the `deployment_guide.md` in the root documentation to deploy:
- The **Next.js Web App** to Vercel (Requires `STRIPE_SECRET_KEY`, `API_KEY_PEPPER`, etc.).
- The **Blockchain Listener** to Fly.io using our `infra/fly.toml`.
- The local **Supabase Migrations** to your live production Supabase instance (`supabase db push`).

### 2. CI/CD Automation
- Set up GitHub Actions workflows to automatically run our `vitest` unit tests and `tsc --noEmit` checks on every Pull Request.
- Configure automatic Vercel deployments and Fly.io deployment actions.

### 3. Monitoring & Analytics
- Ensure that external RPC webhooks (e.g., Helius for Solana, Alchemy for EVM) are properly routing to our production listener endpoints.
- Monitor Upstash Redis usage and listener polling health.
