-- Migration: Atomic Counters and Custodial Keys

-- 1. Create the counter table
CREATE TABLE IF NOT EXISTS merchant_payment_counters (
    merchant_id UUID PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
    current_index BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create the RPC function to securely increment the index
CREATE OR REPLACE FUNCTION get_next_payment_index(p_merchant_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_index BIGINT;
BEGIN
    -- Insert a row if it doesn't exist, or lock and increment if it does
    INSERT INTO merchant_payment_counters (merchant_id, current_index)
    VALUES (p_merchant_id, 1)
    ON CONFLICT (merchant_id) DO UPDATE
    SET current_index = merchant_payment_counters.current_index + 1,
        updated_at = NOW()
    RETURNING current_index INTO v_new_index;

    RETURN v_new_index;
END;
$$;

-- 3. Add custodial key support to payments for Solana
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS custodial_private_key TEXT;
