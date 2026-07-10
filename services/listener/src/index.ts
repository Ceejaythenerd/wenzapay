import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import dotenv from 'dotenv';
import { SolanaListener } from './chains/solana';
import { PolygonListener } from './chains/polygon';
import { TronListener } from './chains/tron';
import { startBillingCron } from './billing';
import { startSettlementCron } from './settlement';
import type { Database } from '@wenzapay/shared';

dotenv.config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const solana = new SolanaListener(supabase, logger);
const polygon = new PolygonListener(supabase, logger);
const tron = new TronListener(supabase, logger);

async function start() {
  logger.info({ service: 'listener', event: 'startup' }, 'Starting WenzaPay Listener Service');

  // Load all pending payments
  const { data: pendingPayments, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'pending');

  if (error) {
    logger.error({ service: 'listener', event: 'startup_error', error }, 'Failed to load pending payments');
    process.exit(1);
  }

  logger.info({ service: 'listener', event: 'payments_loaded', count: pendingPayments.length }, 'Loaded pending payments');

  // Subscribe active payments to chain listeners
  for (const payment of pendingPayments) {
    subscribeToPayment(payment);
  }

  // Real-time subscription to pick up newly created payments
  supabase
    .channel('payments_channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments', filter: "status=eq.'pending'" }, (payload) => {
      logger.info({ service: 'listener', event: 'new_payment_detected', paymentId: payload.new.id }, 'New pending payment');
      subscribeToPayment(payload.new);
    })
    .subscribe((status) => {
      logger.info({ service: 'listener', event: 'realtime_status', status }, 'Realtime subscription status');
    });

  // Start Phase 4: Subscription Billing Engine
  startBillingCron();

  // Start Phase 5: Auto-Settlement Engine
  startSettlementCron();

  // Graceful shutdown
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

function subscribeToPayment(payment: any) {
  if (payment.stealth_address.startsWith('test_')) {
    // Handled by Sandbox logic instead
    return;
  }

  switch (payment.chain) {
    case 'solana':
      solana.subscribe(payment);
      break;
    case 'polygon':
      polygon.subscribe(payment);
      break;
    case 'tron':
      tron.subscribe(payment);
      break;
    default:
      logger.warn({ service: 'listener', event: 'unknown_chain', chain: payment.chain }, 'Unknown chain');
  }
}

function shutdown() {
  logger.info({ service: 'listener', event: 'shutdown' }, 'Shutting down listeners gracefully...');
  solana.close();
  polygon.close();
  tron.close();
  process.exit(0);
}

start();
