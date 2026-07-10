# WenzaPay Project Handover

Welcome back! This document summarizes the current state of the WenzaPay project — what's built, what's a stub, how the codebase is organized, and what we need to focus on next.

---

## Current State

**The core MVP is structurally and visually complete.** The push payment gateway, the recurring subscription engine, fiat off-ramping, the compliance toolkit, and a fully polished marketing site have all been implemented. 

### What's Built So Far

| Feature | Location | Maturity |
|---|---|---|
| **Marketing Site** | `apps/web/app/(public)/` — 9 premium pages (Product, Developers, Company) with shared Layout | Implemented |
| **Merchant Auth & Onboarding** | `apps/web/app/(auth)/` — login, signup, multi-step onboarding wizard | Implemented |
| **Merchant Dashboard** | `apps/web/app/dashboard/` — layout with sidebar, env toggle (Live/Test) | Implemented |
| **Checkout Widget** | `apps/widget/` — 4-step flow (chain select → QR → polling → confirmed), shadow DOM, IIFE bundle | Implemented |
| **Blockchain Listener** | `services/listener/` — Solana WS, Polygon events, Tron polling. Loads pending payments on startup | **Mocked / Simulated** |
| **Risk Engine** | `packages/risk-engine/` — fingerprint, velocity (Redis), wallet scoring, OFAC geo-fencing | **Mocked (Redis missing)** |
| **Multi-Token Swaps** | `services/listener/src/swaps/` — Jupiter (Solana), 1inch (EVM) | **Stubs only** |
| **Analytics** | `apps/web/app/api/analytics/events/` + `dashboard/analytics/` — interactive Recharts charts | Implemented |
| **Webhook System** | `apps/web/app/api/webhooks/` — endpoints, deliveries, deliver worker, test endpoint | **Missing Queue** |
| **Sandbox Mode** | `apps/web/lib/sandbox.ts` + `apps/web/app/api/sandbox/reset/` — test keys, fake payments, auto-confirm | Implemented |
| **Stealth Addresses** | `packages/shared/src/utils/stealth.ts` + `apps/web/lib/crypto/address-registry.ts` | Implemented (Fallback enabled) |
| **Subscription Engine** | `services/listener/src/billing.ts` + `/api/subscriptions/` + Dashboard UI | Implemented (Delegation stubs) |
| **Fiat Off-Ramp** | `services/listener/src/settlement.ts` + `lib/offramp/bridge.ts` + Dashboard UI | Implemented (Bridge stub) |

### Recent Accomplishments (Latest Session)
- **Global Modal System**: Replaced all native browser `alert()` calls across the dashboard and onboarding flows with a beautiful, unified `ModalProvider` (dark neon theme).
- **API Key Security Fix**: Resolved a bug where live API keys were being generated as test keys, and fixed a hashing mismatch between the dashboard API and the payment intent route.
- **Route Group Fix**: Renamed the `(dashboard)` Next.js route group to `dashboard` to correctly map all protected pages to the `/dashboard` path, resolving 404 errors.
- **Service Role RLS Fix**: Configured the `SUPABASE_SERVICE_ROLE_KEY` to allow backend API routes to securely bypass RLS and verify API keys.
- **Onboarding DX**: Added a "Use Mock Wallets" button to quickly autofill master wallet xpubs during testing.

---

## Codebase Overview (Monorepo)

The project uses **Turborepo** with `pnpm` workspaces.

### Full Directory Tree

```
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
│   │   │   ├── (dashboard)/            # Protected dashboard routes
│   │   │   ├── (public)/               # Marketing Site, Docs, and Portals
│   │   │   └── api/                    # API route handlers
│   │   └── components/
│   │       ├── ui/                     # Shared UI components (ScrollToTop, etc)
│   │       └── layout/                 # Extracted Navbar/Footer
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
├── supabase/
│   └── migrations/                     # SQL Schema definitions & RLS
```

---

## Next Steps for Tomorrow: Transitioning to Real Data

We have formally audited the project (`real_data_gaps.md`) and discovered that while the scaffolding is excellent, the heavy-lifting logic is stubbed out.

**Tomorrow's Primary Goal:** Connect the MCP servers and transition the stubs to real infrastructure.

### 1. Setup the IDE with MCP Servers
Before writing the code tomorrow, ensure you have the following open-source **Model Context Protocol (MCP)** servers connected to this IDE:
- `@modelcontextprotocol/server-postgres` (Connected to your Supabase URL)
- `mcp-server-redis` (Connected to your Redis instance)
- `@modelcontextprotocol/server-fetch` (To test webhooks and HTTP APIs)

### 2. Implement Blockchain RPCs
- **Action:** Replace the simulated polling loops in `services/listener/src/chains/` with real WebSocket listeners using `Helius` (Solana) and `Alchemy` (EVM).
- **Action:** Implement actual `@solana/web3.js` and `viem` transaction building and broadcasting logic in `delegation-solana.ts` and `delegation-evm.ts`.

### 3. Activate the Risk Engine
- **Action:** Replace the mocked functions in `packages/risk-engine/src/velocity.ts` with real `ioredis` sliding-window checks against the connected Redis database.

### 4. Wire up the Dashboard APIs
- **Action:** Implement the missing backend logic in `api/keys/route.ts` and `api/merchants/route.ts` so the dashboard correctly updates the Supabase tables instead of relying on `TODO` placeholders.

*See `setup_tasklist.md` and `walkthrough.md` for a full list of required external accounts and API keys.*
