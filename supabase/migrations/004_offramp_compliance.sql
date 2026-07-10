-- Phase 5: Off-ramp and Compliance Tables

-- 1. Merchant Settings (Schedules, Limits, Compliance toggles)
CREATE TABLE public.merchant_settings (
  merchant_id           uuid PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
  offramp_schedule      text DEFAULT 'manual', -- 'manual', 'daily', 'weekly'
  offramp_threshold_usd numeric(18,6) DEFAULT 0,
  offramp_splits        jsonb DEFAULT '[]'::jsonb, -- Array of { destination, percentage }
  kyc_required          boolean DEFAULT false,
  geo_block_enabled     boolean DEFAULT false,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- 2. Offramp Transfers
CREATE TABLE public.offramp_transfers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id           uuid REFERENCES merchants(id),
  amount_usd            numeric(18,6) NOT NULL,
  bank_id               text NOT NULL, -- External reference to connected bank account
  bridge_transfer_id    text, -- External ID from Bridge.xyz
  status                text DEFAULT 'initiated', -- 'initiated', 'in_transit', 'completed', 'failed'
  estimated_arrival     timestamptz,
  created_at            timestamptz DEFAULT now(),
  completed_at          timestamptz
);

-- 3. Customer Verifications (KYC)
CREATE TABLE public.customer_verifications (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_wallet       text NOT NULL,
  persona_inquiry_id    text,
  status                text DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verified_at           timestamptz,
  expires_at            timestamptz,
  created_at            timestamptz DEFAULT now()
);

-- Constraints and Indexing
CREATE INDEX idx_offramp_merchant ON public.offramp_transfers(merchant_id);
CREATE INDEX idx_verif_wallet ON public.customer_verifications(customer_wallet);

-- RLS Policies
ALTER TABLE public.merchant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offramp_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_verifications ENABLE ROW LEVEL SECURITY;

-- Merchant Settings Policies
CREATE POLICY "Merchants can manage their own settings"
  ON public.merchant_settings
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Offramp Transfers Policies
CREATE POLICY "Merchants can view their offramp transfers"
  ON public.offramp_transfers
  FOR SELECT
  USING (merchant_id = auth.uid());

CREATE POLICY "Merchants can create offramp transfers"
  ON public.offramp_transfers
  FOR INSERT
  WITH CHECK (merchant_id = auth.uid());

-- Customer Verifications Policies
-- Merchants can read verifications (to check if a customer is verified)
CREATE POLICY "Merchants can read customer verifications"
  ON public.customer_verifications
  FOR SELECT
  USING (true); -- In reality, might restrict to wallets that transacted with this merchant. For now, public read for authenticated merchants is fine.

-- Service Role policies (Bypasses RLS)
CREATE POLICY "Service Role full access to settings" ON public.merchant_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service Role full access to transfers" ON public.offramp_transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service Role full access to verifications" ON public.customer_verifications FOR ALL USING (true) WITH CHECK (true);
