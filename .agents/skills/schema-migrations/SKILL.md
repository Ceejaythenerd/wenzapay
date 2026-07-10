---
name: schema-migrations
description: >
  Create and apply Supabase migrations to add missing database columns, fix duplicate migration prefixes,
  add payment expiry logic, and ensure RLS completeness. Covers audit items #7, #13, #14, #17, #18, and #21.
---

# Schema & Migrations Agent

## Assigned Audit Items

| # | Severity | Issue |
|---|----------|-------|
| 7 | 🟠 HIGH | No payment expiry logic for stale pending payments |
| 13 | 🟡 MEDIUM | Missing `failure_count` column on `subscriptions` |
| 14 | 🟡 MEDIUM | Missing `derivation_path` and `payment_index` columns on `payments` |
| 17 | 🟡 MEDIUM | `subscriptions` table lacks INSERT/UPDATE RLS |
| 18 | 🟡 MEDIUM | Price feed has no stablecoin peg validation |
| 21 | 🔵 LOW | Duplicate migration prefix `003_` |

---

## Task 1: Create Migration for Missing Columns (Audit #13, #14)

### Steps
1. Create a new migration file: `supabase/migrations/009_missing_columns.sql`
2. Add the following SQL:

```sql
-- Add missing columns to payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS derivation_path TEXT,
ADD COLUMN IF NOT EXISTS payment_index BIGINT;

-- Add missing columns to subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0;
```

### Verification
- Run `npx supabase db push` or apply the migration.
- Confirm the columns exist: `SELECT column_name FROM information_schema.columns WHERE table_name = 'payments' AND column_name IN ('derivation_path', 'payment_index');`

---

## Task 2: Add Payment Expiry Cron Job (Audit #7)

### Steps
1. Create a new migration file: `supabase/migrations/010_payment_expiry.sql`
2. Enable the `pg_cron` extension and create a cron job:

```sql
-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to expire stale pending payments
CREATE OR REPLACE FUNCTION expire_stale_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE payments
  SET status = 'expired'
  WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '60 minutes';
END;
$$;

-- Schedule the job to run every 5 minutes
SELECT cron.schedule(
  'expire-stale-payments',
  '*/5 * * * *',
  $$SELECT expire_stale_payments()$$
);
```

3. Also add `'expired'` as a valid status in any TypeScript enums or status color maps in the dashboard:
   - `apps/web/app/dashboard/page.tsx` — add to `statusColor`
   - `apps/web/app/dashboard/payments/page.tsx` — add to `statusColor`

### Verification
- Create a test payment manually with `created_at` set to 2 hours ago.
- Wait for the cron to fire (or call `SELECT expire_stale_payments()` manually).
- Confirm the payment status is now `'expired'`.

---

## Task 3: Fix Duplicate Migration Prefix (Audit #21)

### Steps
1. Rename `supabase/migrations/003_subscriptions_rls.sql` to `supabase/migrations/003b_subscriptions_rls.sql`.
2. This only matters for ordering; most migration runners sort alphabetically, and `003_phase3_schema.sql` should run before `003b_subscriptions_rls.sql`.

> **NOTE**: If migrations have already been applied to the live Supabase instance, renaming may cause the runner to try to re-apply. Check `supabase_migrations.schema_migrations` table first.

---

## Task 4: Add Subscriptions RLS for Service Role (Audit #17)

### Steps
1. Create migration `supabase/migrations/011_subscriptions_rls_complete.sql`:

```sql
-- Allow merchants to read their own subscriptions
CREATE POLICY "Merchants can read own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (merchant_id = auth.uid());

-- Service role can do everything (used by billing engine)
CREATE POLICY "Service role full access to subscriptions"
  ON public.subscriptions FOR ALL
  USING (true) WITH CHECK (true);
```

### Verification
- Confirm that a logged-in merchant can only see their own subscriptions via the dashboard.

---

## Task 5: Add Stablecoin Peg Health Check (Audit #18)

### Steps
1. Open `packages/shared/src/utils/price-feed.ts`.
2. After fetching prices, add a peg deviation check:
```typescript
const STABLECOINS = ['USDC', 'USDT'];
for (const stable of STABLECOINS) {
  const price = cachedPrices[stable];
  if (price && Math.abs(price - 1.0) > 0.02) {
    console.warn(`[PriceFeed] ⚠️ Stablecoin ${stable} depeg detected: $${price.toFixed(4)}`);
    // Optionally: set a flag that payment creation checks before accepting
  }
}
```
3. Export a `isStablecoinHealthy(symbol: string): boolean` function that returns `false` if the price deviates more than 2%.
4. Optionally integrate this check into `apps/web/app/api/payments/create/route.ts` to reject payments during a depeg event.

### Verification
- Manually set `cachedPrices['USDC'] = 0.85` in a test and confirm the warning fires.
