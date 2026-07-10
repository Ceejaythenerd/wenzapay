-- Allow merchants to read their own subscriptions
CREATE POLICY "Merchants can read own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (merchant_id = auth.uid());

-- Service role can do everything (used by billing engine)
CREATE POLICY "Service role full access to subscriptions"
  ON public.subscriptions FOR ALL
  USING (true) WITH CHECK (true);
