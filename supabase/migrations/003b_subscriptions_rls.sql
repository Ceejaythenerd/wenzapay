-- Subscriptions enhancements for Phase 4

-- 1. Add failure tracking column
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS failure_count integer DEFAULT 0;

-- 2. Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Policy: Merchants can manage their own subscriptions
CREATE POLICY "Merchants can manage own subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Policy: Service role can manage all subscriptions
CREATE POLICY "Service Role can manage all subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);
