import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@wenzapay/shared';
import type { Logger } from 'pino';

export type AppSupabase = SupabaseClient<Database>;
export type AppLogger = Logger;

export interface PendingPayment {
  id: string;
  merchant_id: string;
  stealth_address: string;
  amount_usd: number;
  amount_crypto: number;
  token: string;
  chain: string;
  status: string;
  custodial_private_key?: string;
  created_at: string;
}
