-- Add missing columns to payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS derivation_path TEXT,
ADD COLUMN IF NOT EXISTS payment_index BIGINT;

-- Add missing columns to subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0;
