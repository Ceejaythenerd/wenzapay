-- Fix missing RLS policies for phase 1 and 2 tables

-- Merchants
CREATE POLICY "Merchants can read their own profile"
  ON public.merchants FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Merchants can update their own profile"
  ON public.merchants FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- API Keys
CREATE POLICY "Merchants can manage own API keys"
  ON public.api_keys FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Payments
CREATE POLICY "Merchants can read own payments"
  ON public.payments FOR SELECT
  USING (merchant_id = auth.uid());

-- Webhook Endpoints
CREATE POLICY "Merchants can manage own webhook endpoints"
  ON public.webhook_endpoints FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Webhook Deliveries
CREATE POLICY "Merchants can read own webhook deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.webhook_endpoints we
      WHERE we.id = webhook_deliveries.endpoint_id
      AND we.merchant_id = auth.uid()
    )
  );

-- Risk Events
CREATE POLICY "Merchants can read own risk events"
  ON public.risk_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = risk_events.payment_id
      AND p.merchant_id = auth.uid()
    )
  );
