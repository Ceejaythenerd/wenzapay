import { getDerivationPath } from '@wenzapay/shared';
import type { AppSupabase, AppLogger } from './types';

export async function initiateSweep(
  supabase: AppSupabase,
  logger: AppLogger,
  paymentId: string,
  chain: string
) {
  try {
    // 1. Fetch payment to get merchant info
    const { data: payment, error } = await supabase
      .from('payments')
      .select('merchant_id')
      .eq('id', paymentId)
      .single();

    if (error || !payment) throw error || new Error('Payment not found');

    // For non-custodial, we don't have the private key.
    // We notify the merchant via webhook with the derivation path.
    // Need to compute derivation index based on payment count (simplified for scaffold)
    const { count } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', payment.merchant_id as string)
      .lte('created_at', new Date().toISOString());
      
    const paymentIndex = count || 1;
    const path = getDerivationPath(0, paymentIndex, chain);

    logger.info({ service: 'listener', event: 'sweep_initiated', paymentId, path }, 'Initiating non-custodial sweep');

    // Log the sweep event to ledger
    await supabase.from('ledger_events').insert({
      payment_id: paymentId,
      event_type: 'sweep.initiated',
      metadata: { path, message: 'Non-custodial sweep ready' }
    });

    // In a fully built system, this would queue a specific `payment.ready_to_sweep` webhook

  } catch (err: any) {
    logger.error({ service: 'listener', event: 'sweep_error', error: err.message, paymentId }, 'Error initiating sweep');
  }
}
