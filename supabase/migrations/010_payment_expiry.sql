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
