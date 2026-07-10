import { Client } from '@upstash/qstash';
import type { AppSupabase, AppLogger } from './types';

let qstash: Client | null = null;
if (process.env.QSTASH_TOKEN) {
  qstash = new Client({ token: process.env.QSTASH_TOKEN });
}

export async function enqueueWebhook(
  supabase: AppSupabase,
  logger: AppLogger,
  merchantId: string,
  eventType: string,
  payloadData: any
) {
  if (!qstash || !process.env.WEBHOOK_WORKER_URL) {
    logger.warn({ service: 'listener', event: 'qstash_skip' }, 'QStash not configured, skipping webhook push');
    return;
  }

  // Find active endpoints for merchant
  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('enabled', true);

  if (!endpoints || endpoints.length === 0) return;

  for (const ep of endpoints) {
    const payload = {
      id: "evt_" + Math.random().toString(36).substring(2, 11),
      type: eventType,
      created: new Date().toISOString(),
      data: { object: payloadData }
    };

    const { data: delivery, error } = await supabase
      .from('webhook_deliveries')
      .insert({
        endpoint_id: ep.id,
        payment_id: payloadData.id || null, // Best effort
        event_type: eventType,
        payload: payload,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error || !delivery) {
      logger.error({ err: error }, 'Failed to create webhook delivery record');
      continue;
    }

    try {
      await qstash.publishJSON({
        url: process.env.WEBHOOK_WORKER_URL,
        body: { deliveryId: delivery.id }
      });
      logger.info({ deliveryId: delivery.id, eventType }, 'Queued webhook delivery via QStash');
    } catch (qErr) {
      logger.error({ error: qErr, deliveryId: delivery.id }, 'Failed to publish to QStash');
    }
  }
}
