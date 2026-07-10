---
name: env-and-infra
description: >
  Set up missing infrastructure: Dockerfiles for the web app, complete environment variable
  documentation, and widget deployment pipeline. Covers audit items #12, #15, and #16.
---

# Environment & Infrastructure Agent

## Assigned Audit Items

| # | Severity | Issue |
|---|----------|-------|
| 12 | 🟡 MEDIUM | Missing `apps/web/Dockerfile` referenced by docker-compose |
| 15 | 🟡 MEDIUM | 13+ missing environment variables |
| 16 | 🟡 MEDIUM | Widget has no build/deploy pipeline |

---

## Task 1: Create Web App Dockerfile (Audit #12)

### Steps
1. Create `apps/web/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/risk-engine/package.json packages/risk-engine/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build --filter=web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

2. Update `apps/web/next.config.ts` to enable standalone output:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};
```

### Verification
- Run `docker build -f apps/web/Dockerfile -t wenzapay-web .` from the monorepo root.
- Run `docker run -p 3000:3000 wenzapay-web` and confirm the app loads at `http://localhost:3000`.

---

## Task 2: Complete Environment Variable Documentation (Audit #15)

### Steps
1. Open `.env.example` and add ALL missing variables with placeholder values:

```env
# WenzaPay Monorepo Environment Variables

# ─── Supabase ───────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key
SUPABASE_SERVICE_ROLE_KEY=placeholder_service_role_key
SUPABASE_URL=http://127.0.0.1:54321

# ─── Security ──────────────────────────────────
WENZAPAY_XPUB_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
API_KEY_PEPPER=generate-a-random-64-char-hex-string

# ─── Blockchain RPCs ──────────────────────────
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=placeholder
HELIUS_WSS_URL=wss://mainnet.helius-rpc.com/?api-key=placeholder
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
POLYGON_RPC_URL=https://polygon-rpc.com
ALCHEMY_WSS_URL=wss://polygon-mainnet.g.alchemy.com/v2/placeholder
TRON_PRO_API_KEY=placeholder_trongrid_api_key

# ─── Messaging & Webhooks ────────────────────
QSTASH_TOKEN=placeholder_qstash_token
WEBHOOK_WORKER_URL=http://localhost:3000/api/webhooks/deliver

# ─── Off-ramp ────────────────────────────────
BRIDGE_API_KEY=placeholder_bridge_api_key
OFFRAMP_ENABLED=false

# ─── DEX Aggregators ────────────────────────
ONEINCH_API_KEY=placeholder_1inch_api_key

# ─── SaaS Billing ───────────────────────────
STRIPE_SECRET_KEY=sk_test_placeholder

# ─── Vault / Authority ──────────────────────
WENZAPAY_VAULT_ADDRESS=11111111111111111111111111111111
WENZAPAY_AUTHORITY_PRIVATE_KEY=placeholder_authority_key

# ─── Redis ──────────────────────────────────
REDIS_URL=redis://127.0.0.1:8079
```

2. Create a section in `README.md` documenting which variables are required vs optional,
   and which services they belong to.

### Verification
- Diff `.env.example` against all `process.env.*` references in the codebase.
- Confirm every referenced variable has a placeholder entry.

---

## Task 3: Create Widget Deployment Pipeline (Audit #16)

### Steps
1. Open `apps/widget/package.json` and ensure it has a `build` script that produces a single bundled JS file (e.g., via Vite library mode).
2. Add a `vite.config.ts` (or update existing) with library mode:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'WenzaPay',
      fileName: 'wenzapay-widget',
      formats: ['iife']
    },
    rollupOptions: {
      // Don't externalize React since it should be self-contained
    }
  }
});
```
3. Add an embed snippet to the widget's README:
```html
<div id="wenzapay-widget"></div>
<script src="https://cdn.wenzapay.com/widget/wenzapay-widget.iife.js"></script>
<script>
  WenzaPay.mount('#wenzapay-widget', {
    apiKey: 'wpay_live_xxx',
    amount: '25.00',
    currency: 'USD',
    reference: 'order_123'
  });
</script>
```
4. Document the deployment target (e.g., Cloudflare R2, S3 + CloudFront, or Vercel Edge).

### Verification
- Run `pnpm --filter widget build` and confirm a single `.iife.js` file is produced.
- Open an HTML file with the embed snippet and confirm the widget renders.
