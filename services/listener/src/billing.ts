import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import { 
  executeSolanaRecurringCharge, 
  executeEVMRecurringCharge,
  appendLedger 
} from '@wenzapay/shared';
import { enqueueWebhook } from './webhook';

const logger = pino({ name: 'billing-engine' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Calculates the next billing date based on the interval.
 */
export function getNextBillingDate(interval: string, fromDate: Date = new Date()): Date {
  const next = new Date(fromDate);
  switch (interval) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'annual':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1); // fallback
  }
  return next;
}

/**
 * Core billing logic. Fetches due subscriptions and charges them.
 */
export async function runBillingCycle() {
  logger.info('Starting billing cycle...');
  
  const now = new Date().toISOString();
  
  const { data: dueSubscriptions, error } = await supabase
    .from('subscriptions')
    .select('*, merchants(master_wallet_sol, master_wallet_evm)')
    .eq('status', 'active')
    .lte('next_billing', now);

  if (error || !dueSubscriptions) {
    logger.error({ err: error }, 'Failed to fetch due subscriptions');
    return;
  }

  logger.info(`Found ${dueSubscriptions.length} subscriptions due for billing.`);

  for (const sub of dueSubscriptions) {
    try {
      logger.info({ subId: sub.id }, 'Executing recurring charge');
      
      const isSolana = sub.chain === 'solana';
      const merchantWallet = isSolana ? sub.merchants?.master_wallet_sol : sub.merchants?.master_wallet_evm;
      
      if (!merchantWallet) {
        throw new Error(`Merchant missing master wallet for chain ${sub.chain}`);
      }

      const authorityKey = isSolana 
        ? process.env.SOLANA_AUTHORITY_KEY
        : process.env.EVM_AUTHORITY_KEY;
        
      if (!authorityKey) {
        throw new Error(`Missing authority key for chain ${sub.chain}`);
      }
      
      let result;
      if (isSolana) {
        result = await executeSolanaRecurringCharge(
          sub.id,
          sub.customer_wallet,
          merchantWallet,
          sub.amount_usd,
          authorityKey
        );
      } else {
        result = await executeEVMRecurringCharge(
          sub.chain as 'polygon' | 'tron',
          sub.id,
          sub.customer_wallet,
          merchantWallet,
          sub.amount_usd,
          authorityKey
        );
      }

      if (!result.success) {
        throw new Error(result.error || 'Charge failed');
      }

      // Update subscription to next period and reset failure count
      const nextBilling = getNextBillingDate(sub.interval);
      await supabase.from('subscriptions').update({
        next_billing: nextBilling.toISOString(),
        failure_count: 0
      }).eq('id', sub.id);

      // Ledger event
      await appendLedger(supabase, null as any, 'subscription.renewed', { 
        subscription_id: sub.id,
        amount_usd: sub.amount_usd,
        tx_hash: result.txHash
      }, sub.merchant_id);

      // Enqueue webhook
      await enqueueWebhook(supabase, logger, sub.merchant_id, 'subscription.renewed', {
        id: sub.id,
        amount_usd: sub.amount_usd,
        status: 'active',
        next_billing: nextBilling.toISOString()
      });
      logger.info({ subId: sub.id, tx: result.txHash }, 'Subscription successfully renewed');
      
    } catch (err: any) {
      await handleBillingFailure(sub, err);
    }
  }
}

/**
 * Handles payment failures with dunning logic.
 */
async function handleBillingFailure(sub: any, error: any) {
  logger.warn({ subId: sub.id, err: error.message }, 'Subscription billing failed');
  
  const retryScheduleDays = [1, 3, 7]; // retry after 1 day, then 3 days later, then 7 days later
  const currentFailures = sub.failure_count || 0;
  
  if (currentFailures < retryScheduleDays.length) {
    // Schedule retry
    const nextRetry = new Date();
    nextRetry.setDate(nextRetry.getDate() + retryScheduleDays[currentFailures]);
    
    // If it's failed 2 or more times, pause the subscription while retrying
    const newStatus = currentFailures >= 1 ? 'paused' : 'active';
    
    await supabase.from('subscriptions').update({
      failure_count: currentFailures + 1,
      next_billing: nextRetry.toISOString(),
      status: newStatus
    }).eq('id', sub.id);
    
    await appendLedger(supabase, null as any, 'subscription.payment_failed', { 
      subscription_id: sub.id,
      reason: error.message,
      attempt: currentFailures + 1
    });
    
    logger.info({ subId: sub.id, nextRetry }, 'Scheduled subscription billing retry');
  } else {
    // Max retries reached, cancel subscription
    logger.error({ subId: sub.id }, 'Max billing retries reached, cancelling subscription');
    
    await supabase.from('subscriptions').update({
      status: 'cancelled'
    }).eq('id', sub.id);
    
    await appendLedger(supabase, null as any, 'subscription.cancelled', { 
      subscription_id: sub.id,
      reason: 'payment_failure'
    });
  }
}

// Start the cron job
export function startBillingCron() {
  logger.info('Initializing Subscription Billing Engine (Cron: 0 * * * *)');
  // Runs at minute 0 of every hour
  cron.schedule('0 * * * *', runBillingCycle);
}
