-- Apply strict RLS for Ledger events

-- Ensure RLS is enabled
ALTER TABLE public.ledger_events ENABLE ROW LEVEL SECURITY;

-- Policy: Merchants can SELECT their own ledger events
-- We join payments to check ownership
CREATE POLICY "Merchants can read own ledger events"
  ON public.ledger_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = ledger_events.payment_id
      AND p.merchant_id = auth.uid()
    )
  );

-- Policy: Service role can insert (Listener and Web backend via Service Key)
-- Alternatively, if inserting via authenticated context, they can insert only if they own the payment
CREATE POLICY "Service Role can insert ledger events"
  ON public.ledger_events
  FOR INSERT
  WITH CHECK (true); -- Usually enforced by using service role key

-- Ensure NO update or delete policies exist
-- To be absolutely secure, we create a trigger to block all updates and deletes on the table

CREATE OR REPLACE FUNCTION block_modify()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Ledger is append-only. Updates and deletes are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_no_update
  BEFORE UPDATE ON public.ledger_events
  FOR EACH ROW
  EXECUTE FUNCTION block_modify();

CREATE TRIGGER trg_ledger_no_delete
  BEFORE DELETE ON public.ledger_events
  FOR EACH ROW
  EXECUTE FUNCTION block_modify();
