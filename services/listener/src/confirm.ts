import { enqueueWebhook } from './webhook';
import type { AppSupabase, AppLogger } from './types';

export async function onPaymentConfirmed(
  supabase: AppSupabase,
  logger: AppLogger,
  paymentId: string,
  txHash: string,
  amountReceived: number,
  chain: string,
  swapPayload?: any
) {
  try {
    // 1. Optimistic lock update
    const { data, error } = await supabase
      .from('payments')
      .update({ 
        status: 'confirmed', 
        tx_hash: txHash, 
        confirmed_at: new Date().toISOString() 
      })
      .eq('id', paymentId)
      .eq('status', 'pending')
      .select('id, merchant_id, amount_usd, token, status');

    if (error) throw error;
    
    // If no row was updated, it means it was already processed
    if (!data || data.length === 0) {
      logger.info({ service: 'listener', event: 'idempotency_skip', paymentId, txHash }, 'Payment already confirmed');
      return;
    }

    logger.info({ service: 'listener', event: 'payment_confirmed', paymentId, txHash }, 'Payment successfully confirmed');

    // 2. Ledger event
    // Using simple insert here, but normally via shared ledger package
    await supabase.from('ledger_events').insert({
      payment_id: paymentId,
      merchant_id: data[0].merchant_id,
      event_type: 'payment.confirmed',
      metadata: { txHash, amountReceived, swapPayload }
    });

    // 3. Webhook delivery via QStash
    const paymentRecord = data[0];
    const payload = swapPayload ? { ...paymentRecord, swapPayload } : paymentRecord;
    await enqueueWebhook(supabase, logger, paymentRecord.merchant_id as string, 'payment.confirmed', payload);

    // 4. Trigger auto-sweep
    const { initiateSweep } = await import('./sweep');
    await initiateSweep(supabase, logger, paymentId, chain);

  } catch (err: any) {
    logger.error({ service: 'listener', event: 'confirmation_error', error: err.message, paymentId }, 'Error confirming payment');
  }
}
