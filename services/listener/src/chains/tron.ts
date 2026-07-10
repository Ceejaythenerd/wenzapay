import { onPaymentConfirmed } from '../confirm';
import type { AppSupabase, AppLogger, PendingPayment } from '../types';

export class TronListener {
  private subscriptions: Map<string, { stop: () => void }> = new Map();
  private supabase: AppSupabase;
  private logger: AppLogger;

  constructor(supabase: AppSupabase, logger: AppLogger) {
    this.supabase = supabase;
    this.logger = logger;
  }

  subscribe(payment: PendingPayment) {
    if (this.subscriptions.has(payment.id)) return;

    try {
      let isSubscribed = true;
      let timer: NodeJS.Timeout | null = null;

      const expiry = setTimeout(() => {
        this.logger.info({ paymentId: payment.id }, 'Tron payment subscription expired');
        this.unsubscribe(payment.id);
      }, 60 * 60 * 1000); // 60 minutes

      const poll = async () => {
        if (!isSubscribed) return;
        try {
          const stealthAddress = payment.stealth_address;
          const url = `https://api.trongrid.io/v1/accounts/${stealthAddress}/transactions/trc20`;
          
          const headers: Record<string, string> = {
            'Accept': 'application/json'
          };
          
          if (process.env.TRON_PRO_API_KEY) {
            headers['TRON-PRO-API-KEY'] = process.env.TRON_PRO_API_KEY;
          }

          const response = await fetch(url, { headers });
          if (!response.ok) {
            if (isSubscribed) timer = setTimeout(poll, 15000);
            return;
          }

          const data = await response.json();
          if (!data.success || !data.data || data.data.length === 0) {
            if (isSubscribed) timer = setTimeout(poll, 15000);
            return;
          }

          let paymentFound = false;
          // Check if any incoming TRC20 transfer matches the criteria
          for (const tx of data.data) {
            if (tx.to === stealthAddress) {
              const decimals = parseInt(tx.token_info.decimals, 10);
              const expectedAmountBaseUnits = BigInt(Math.floor(Number(payment.amount_crypto) * Math.pow(10, decimals)));
              const actualAmountBaseUnits = BigInt(tx.value);
              
              if (actualAmountBaseUnits >= expectedAmountBaseUnits) {
                paymentFound = true;
                this.logger.info({ paymentId: payment.id, txHash: tx.transaction_id }, 'Tron payment detected via TronGrid');
                const txHash = tx.transaction_id;
                let amountReceived = Number(actualAmountBaseUnits) / Math.pow(10, decimals);

                // Tron DEX swaps (e.g., SunSwap) are not currently supported by our 1inch integration.
                // We forward the raw token to the merchant.
                if (payment.token !== 'USDT') {
                  this.logger.warn({ paymentId: payment.id, token: payment.token }, 'Tron automated DEX swaps are not supported. Forwarding raw token.');
                }
                
                this.unsubscribe(payment.id);
                await onPaymentConfirmed(
                  this.supabase,
                  this.logger,
                  payment.id,
                  txHash,
                  amountReceived,
                  'tron'
                );
                
                break;
              }
            }
          }
          
          if (!paymentFound && isSubscribed) {
            timer = setTimeout(poll, 15000);
          }
        } catch (err: any) {
          this.logger.warn({ error: err.message }, 'Failed to poll TronGrid API');
          if (isSubscribed) timer = setTimeout(poll, 15000);
        }
      };

      poll();

      this.subscriptions.set(payment.id, {
        stop: () => {
          isSubscribed = false;
          if (timer) clearTimeout(timer);
          clearTimeout(expiry);
        }
      });
      this.logger.info({ paymentId: payment.id, address: payment.stealth_address }, 'Subscribed to Tron address');
    } catch (err: any) {
      this.logger.error({ paymentId: payment.id, error: err.message }, 'Failed to subscribe to Tron');
    }
  }

  unsubscribe(paymentId: string) {
    const sub = this.subscriptions.get(paymentId);
    if (sub) {
      sub.stop();
      this.subscriptions.delete(paymentId);
    }
  }

  close() {
    for (const [id] of this.subscriptions) {
      this.unsubscribe(id);
    }
  }
}
