---
name: code-quality-cleanup
description: >
  Improve code quality across the WenzaPay monorepo: replace pervasive `any` types with proper
  TypeScript interfaces, remove dead code and orphan files, and clean up the Git tree.
  Covers audit items #19, #20, #22, and #23.
---

# Code Quality & Cleanup Agent

## Assigned Audit Items

| # | Severity | Issue |
|---|----------|-------|
| 19 | 🔵 LOW | Pervasive `any` types across the codebase |
| 20 | 🔵 LOW | `memo.ts` is unused and not exported |
| 22 | 🔵 LOW | `merge_sql.js` orphaned at project root |
| 23 | 🔵 LOW | `wenzapay_antigravity_agents.md` (68KB) committed to Git |

---

## Task 1: Replace `any` Types with Proper Interfaces (Audit #19)

### Context
Almost every Supabase client, payment object, and logger in the codebase is typed as `any`.
This defeats TypeScript's purpose and makes refactoring dangerous.

### Steps

1. **Listener service** — The most impactful area. Focus on:
   - `services/listener/src/chains/solana.ts` — `supabase: any`, `logger: any`, `payment: any`
   - `services/listener/src/chains/polygon.ts` — same pattern
   - `services/listener/src/chains/tron.ts` — same pattern
   - `services/listener/src/confirm.ts` — `supabase: any`, `logger: any`
   - `services/listener/src/webhook.ts` — `supabase: any`, `logger: any`
   - `services/listener/src/sweep.ts` — `supabase: any`, `logger: any`

2. Create a shared types file `services/listener/src/types.ts`:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@wenzapay/shared';
import type { Logger } from 'pino';

export type AppSupabase = SupabaseClient<Database>;
export type AppLogger = Logger;

export interface PendingPayment {
  id: string;
  merchant_id: string;
  stealth_address: string;
  amount_usd: number;
  amount_crypto: number;
  token: string;
  chain: string;
  status: string;
  custodial_private_key?: string;
  created_at: string;
}
```

3. Replace `any` with the proper types in all listener files.

4. **Dashboard pages** — Replace `useState<any[]>` with proper types:
   - `apps/web/app/dashboard/page.tsx` — `payments`, `recentPayments`, `riskAlerts`
   - `apps/web/app/dashboard/payments/page.tsx` — `payments`
   - Use the `Database['public']['Tables']['payments']['Row']` type from `@wenzapay/shared`.

### Verification
- Run `npx tsc --noEmit` in both `apps/web` and `services/listener` and confirm no new errors.

---

## Task 2: Remove Dead Code (Audit #20, #22)

### Steps

1. **`packages/shared/src/utils/memo.ts`** — Either:
   - Export it from `packages/shared/src/index.ts` if it's intentionally kept for future use.
   - Or delete it if it's truly unused.

2. **`merge_sql.js`** at the monorepo root:
   - Check if any script or CI step references it.
   - If not, delete it: `git rm merge_sql.js`

### Verification
- `grep -r "memo" packages/shared/src/` — confirm no remaining references if deleted.
- `grep -r "merge_sql" .` — confirm no references.

---

## Task 3: Move Large Planning Documents Out of Git (Audit #23)

### Steps

1. **`wenzapay_antigravity_agents.md`** (68KB) is a planning document that bloats the repo.
   - Add it to `.gitignore`:
     ```
     wenzapay_antigravity_agents.md
     ```
   - Remove from tracking: `git rm --cached wenzapay_antigravity_agents.md`
   - Consider moving it to a Notion page, GitHub Wiki, or `.agents/` directory.

2. Similarly, `saas_project_review_checklist.md` could be moved to a wiki or docs folder.

### Verification
- `git status` should show the files as untracked.
- The repo size should decrease after the next `git gc`.
