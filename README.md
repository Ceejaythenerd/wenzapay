# WenzaPay 💳

WenzaPay is a non-custodial stablecoin payment orchestration SaaS designed specifically for high-risk merchants. This monorepo contains all the microservices, front-end applications, and shared packages that power the platform.

## 🚀 Features

- **Non-Custodial**: Payments go straight to merchant-controlled wallets.
- **Multi-Chain Support**: Handle payments on Solana, Tron, and Polygon seamlessly.
- **Dynamic Stealth Addresses**: Derived from merchant `xpub` via BIP32 for privacy and tracking.
- **Embedded Checkout Widget**: A drop-in, zero-dependency CDN-hosted widget for instant checkout integration.
- **Real-Time Dashboard**: Merchant dashboard for live payment tracking, API key management, and webhook configurations.
- **Robust Risk Engine**: Standalone ML-informed risk scoring for transactions.
- **Immutable Ledger**: Append-only PostgreSQL database for guaranteed audit trails.
- **Reliable Webhooks**: Resilient webhook delivery with exponential backoff and retries.

## 🏗️ Repository Structure

This project uses [Turborepo](https://turbo.build/) and `pnpm` to manage its workspace.

- **`apps/web`**: Next.js 15 App Router containing the merchant dashboard and API layer.
- **`apps/widget`**: Standalone Vite bundle providing the embeddable CDN-hosted checkout widget.
- **`services/listener`**: Persistent Node.js process monitoring blockchain nodes for payment events.
- **`packages/shared`**: Shared TypeScript types, Zod schemas, and utility functions.
- **`packages/risk-engine`**: Standalone module for risk scoring capabilities.
- **`supabase/`**: PostgreSQL database migrations and seed data.
- **`infra/`**: Docker configurations for local development and Fly.io deployment configs.

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) with Real-time & RLS
- **Background Tasks & Queues**: [Upstash QStash / Redis](https://upstash.com/)
- **Widget Bundler**: [Vite](https://vitejs.dev/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Monorepo Build System**: [Turborepo](https://turbo.build/)

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm (v9+)
- Docker (for local Supabase/Redis)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/wenzapay.git
   cd wenzapay
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Environment Setup:**
   Copy the example environment file and fill in the required credentials.
   ```bash
   cp .env.example .env
   ```
   *Make sure to configure Supabase, Upstash, and relevant RPC URLs as defined in the `ARCHITECTURE.md`.*

4. **Start Development Servers:**
   ```bash
   pnpm dev
   ```

## 📜 Critical Development Rules

If you are contributing to WenzaPay, please adhere to these strict rules:

1. **No Next.js Blockchain Monitoring**: The blockchain listener is ALWAYS a separate persistent Node.js process (`services/listener/`). Serverless environments terminate connections unpredictably.
2. **API Key Security**: Never store raw API keys. Hash with SHA-256 before database insertion.
3. **Address Derivation**: Stealth addresses are derived via BIP32 from the merchant's `xpub`. `paymentIndex` increments atomically. Do not reuse indexes.
4. **Immutable Ledger**: The `ledger_events` table is append-only. `UPDATE` or `DELETE` operations are strictly forbidden.
5. **Precise Financial Math**: All monetary amounts are stored as `numeric(18,6)` in the database. Never use JavaScript float arithmetic for currency operations.
6. **Risk Gates**: Payment risk scores must be computed and stored *before* returning the payment address to the widget.
7. **Strict Package Management**: Use `pnpm` exclusively. Never run `npm install` or commit `node_modules`.

## 📚 Further Reading

- [Architecture Blueprint](./ARCHITECTURE.md) - Deep dive into database schemas, service maps, and API contracts.
- [Handover Notes](./HANDOVER.md) - Project context and handover details.
