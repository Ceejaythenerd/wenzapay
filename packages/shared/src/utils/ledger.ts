// Utility to append to the immutable ledger without blocking the main flow

export async function appendLedger(
  supabase: any,
  paymentId: string | null,
  eventType: string,
  metadata: Record<string, any> = {},
  merchantId?: string
) {
  try {
    // We intentionally don't await this or we catch errors so it doesn't block
    const { error } = await supabase.from('ledger_events').insert({
      payment_id: paymentId,
      merchant_id: merchantId || null,
      event_type: eventType,
      metadata
    });

    if (error) {
      console.error('Ledger Append Error:', error.message);
      // Depending on strictness, we might want to alert here, but we shouldn't throw 
      // and break the main payment flow.
    }
  } catch (err: any) {
    console.error('Ledger Append Exception:', err.message);
  }
}
