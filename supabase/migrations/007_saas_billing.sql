-- Add SaaS Billing fields to the merchants table
ALTER TABLE merchants
ADD COLUMN saas_tier text DEFAULT 'free',
ADD COLUMN stripe_customer_id text UNIQUE,
ADD COLUMN stripe_subscription_id text UNIQUE;

-- The merchants can already read their own rows due to existing RLS:
-- "merchants can read own data" policy should cover these new columns if it exists.
-- If not, let's ensure merchants can read their own data.

CREATE POLICY "Merchants can read own profile"
  ON merchants FOR SELECT
  USING (id = auth.uid());

-- NOTE: The service_role key will be used to UPDATE these fields from the Stripe Webhook.
