---
name: supabase-client-audit
description: >
  Fix misuse of the browser Supabase client (`@/lib/supabase/client`) inside Next.js API routes
  where the server client (`@/lib/supabase/server`) should be used instead. Covers audit item #3
  and a full sweep of all API routes for the same pattern.
---

# Supabase Client Audit Agent

## Assigned Audit Items

| # | Severity | Issue |
|---|----------|-------|
| 3 | 🔴 CRITICAL | Webhook endpoints API route uses browser client on server |
| 9 | 🟠 HIGH | `ledger_events` missing `merchant_id` on insert |

---

## Task 1: Fix Browser Client Usage in API Routes (Audit #3)

### Context
`apps/web/app/api/webhooks/endpoints/route.ts` imports `createClient` from `@/lib/supabase/client`,
which is the **browser** SSR client. In a Next.js API route handler, this client cannot access
cookies properly, so `supabase.auth.getUser()` will return `null`.

### Steps

1. **Audit all API routes** — Search for `from '@/lib/supabase/client'` or `from "@/lib/supabase/client"` in the `apps/web/app/api/` directory.
2. For each match, determine whether the route needs:
   - **Authenticated user context** → Use `createClient` from `@/lib/supabase/server` (which reads cookies via `next/headers`).
   - **Service-level bypass (no RLS)** → Use `createAdminClient` from `@/lib/supabase/admin`.
   - **Public API with API key auth** → Use `createClient` from `@supabase/supabase-js` directly with service role key (already done correctly in `payments/create/route.ts`).

3. **Known affected files**:
   - `apps/web/app/api/webhooks/endpoints/route.ts` → Change to server client
   - `apps/web/app/api/webhooks/test/route.ts` → Check and fix
   - `apps/web/app/api/webhooks/deliveries/[id]/replay/route.ts` → Check and fix
   - `apps/web/app/api/ledger/export/route.ts` → Check and fix

4. For each file, replace:
   ```typescript
   import { createClient } from '@/lib/supabase/client';
   ```
   with:
   ```typescript
   import { createClient } from '@/lib/supabase/server';
   ```
   And since the server `createClient` is `async`, update all call sites:
   ```typescript
   const supabase = await createClient();
   ```

### Verification
- After changes, test each endpoint by calling it from the browser while logged in.
- Confirm `supabase.auth.getUser()` returns a valid user object (not `null`).

---

## Task 2: Add `merchant_id` to Ledger Inserts (Audit #9)

### Context
The `ledger_events` table has a `merchant_id` column and its RLS policy filters by `merchant_id = auth.uid()`.
But inserts in `services/listener/src/confirm.ts` and `packages/shared/src/utils/ledger.ts` omit `merchant_id`.

### Steps

1. Update `packages/shared/src/utils/ledger.ts` to accept an optional `merchantId` parameter:
   ```typescript
   export async function appendLedger(
     supabase: any,
     paymentId: string | null,
     eventType: string,
     metadata: Record<string, any> = {},
     merchantId?: string
   ) {
     await supabase.from('ledger_events').insert({
       payment_id: paymentId,
       merchant_id: merchantId || null,
       event_type: eventType,
       metadata
     });
   }
   ```

2. Update all callers to pass `merchantId` when available:
   - `services/listener/src/confirm.ts` — pass `paymentRecord.merchant_id`
   - `services/listener/src/billing.ts` — pass `sub.merchant_id`
   - `apps/web/app/api/payments/create/route.ts` — pass `keyData.merchant_id`

### Verification
- Query `SELECT * FROM ledger_events WHERE merchant_id IS NULL` — should return 0 rows for new entries.
