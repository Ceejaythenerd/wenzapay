import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
// Removed mock comment. Bridge API is now integrated via fetch to api.bridge.xyz

const logger = pino({ name: 'settlement-engine' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Initiates settlement using Bridge API (mocked for listener)
 */
async function initiateBridgeSettlement(merchantId: string, amountUsd: number, bankId: string) {
  const apiKey = process.env.BRIDGE_API_KEY;
  if (!apiKey) {
    throw new Error('BRIDGE_API_KEY is not configured');
  }

  const response = await fetch('https://api.bridge.xyz/v0/transfers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': apiKey,
    },
    body: JSON.stringify({
      amount: amountUsd.toString(),
      currency: 'usd',
      source: {
        payment_rail: 'crypto', // Example, this would be customized
        currency: 'usdc'
      },
      destination: {
        payment_rail: 'wire',
        currency: 'usd',
        external_account_id: bankId
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Bridge settlement failed: ${response.statusText} - ${await response.text()}`);
  }

  const data = await response.json();
  
  return {
    transferId: data.id,
    status: data.status || 'in_transit'
  };
}

/**
 * Core settlement logic. 
 */
export async function runSettlementCycle() {
  if (process.env.OFFRAMP_ENABLED !== 'true') {
    return;
  }
  
  logger.info('Starting auto-settlement cycle...');
  
  // 1. Find all merchants with auto-settlement enabled
  // Let's assume 'daily' runs at midnight UTC, 'weekly' on Sunday.
  const isSunday = new Date().getDay() === 0;
  
  const schedulesToRun = ['daily'];
  if (isSunday) schedulesToRun.push('weekly');
  
  const { data: settings, error } = await supabase
    .from('merchant_settings')
    .select('merchant_id, offramp_schedule, offramp_threshold_usd, offramp_splits')
    .in('offramp_schedule', schedulesToRun);

  if (error || !settings) {
    logger.error({ err: error }, 'Failed to fetch merchant settings for settlement');
    return;
  }

  // 2. For each merchant, calculate their unsettled balance
  for (const setting of settings) {
    try {
      // Calculate unsettled balance
      // (Total confirmed payments) - (Total initiated/completed offramp transfers)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount_usd')
        .eq('merchant_id', setting.merchant_id)
        .eq('status', 'confirmed');
        
      const { data: transfers } = await supabase
        .from('offramp_transfers')
        .select('amount_usd')
        .eq('merchant_id', setting.merchant_id)
        .neq('status', 'failed');
        
      const totalIn = payments?.reduce((sum, p) => sum + Number(p.amount_usd), 0) || 0;
      const totalOut = transfers?.reduce((sum, t) => sum + Number(t.amount_usd), 0) || 0;
      
      const balance = totalIn - totalOut;
      
      if (balance > 0 && balance >= Number(setting.offramp_threshold_usd)) {
        logger.info({ merchantId: setting.merchant_id, balance }, 'Initiating auto-settlement');
        
        const splits = setting.offramp_splits as Array<{ destination: string }>;
        if (!splits || splits.length === 0) {
          logger.warn({ merchantId: setting.merchant_id }, 'No offramp splits configured, skipping settlement');
          continue;
        }
        const bankId = splits[0].destination;
        if (!bankId) {
          logger.warn({ merchantId: setting.merchant_id }, 'Invalid offramp split destination, skipping settlement');
          continue;
        }
        
        const result = await initiateBridgeSettlement(setting.merchant_id, balance, bankId);
        
        await supabase.from('offramp_transfers').insert({
          merchant_id: setting.merchant_id,
          amount_usd: balance,
          bank_id: bankId,
          bridge_transfer_id: result.transferId,
          status: result.status
        });
        
        logger.info({ transferId: result.transferId }, 'Settlement initiated successfully');
      }
      
    } catch (err: any) {
      logger.error({ merchantId: setting.merchant_id, err: err.message }, 'Settlement failed for merchant');
    }
  }
}

// Start the cron job
export function startSettlementCron() {
  if (process.env.OFFRAMP_ENABLED === 'true') {
    logger.info('Initializing Settlement Engine (Cron: 0 0 * * *)');
    // Runs daily at 00:00 UTC
    cron.schedule('0 0 * * *', runSettlementCycle);
  } else {
    logger.info('Settlement Engine disabled via OFFRAMP_ENABLED feature flag');
  }
}
