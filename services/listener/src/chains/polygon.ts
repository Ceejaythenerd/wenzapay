import { createPublicClient, http, webSocket, parseAbiItem } from 'viem';
import { polygon } from 'viem/chains';
import { onPaymentConfirmed } from '../confirm';
import type { AppSupabase, AppLogger, PendingPayment } from '../types';

const USDC_POLYGON = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

export class PolygonListener {
  private client;
  private subscriptions: Map<string, () => void> = new Map();
  private supabase: AppSupabase;
  private logger: AppLogger;

  constructor(supabase: AppSupabase, logger: AppLogger) {
    this.supabase = supabase;
    this.logger = logger;
    
    const wssUrl = process.env.ALCHEMY_WSS_URL;
    const httpUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';

    this.client = createPublicClient({
      chain: polygon,
      transport: wssUrl ? webSocket(wssUrl) : http(httpUrl)
    });
  }

  subscribe(payment: PendingPayment) {
    if (this.subscriptions.has(payment.id)) return;

    try {
      const stealthAddress = payment.stealth_address as `0x${string}`;

      const expiry = setTimeout(() => {
        this.logger.info({ paymentId: payment.id }, 'Polygon payment subscription expired');
        this.unsubscribe(payment.id);
      }, 60 * 60 * 1000); // 60 minutes

      const unwatch = this.client.watchContractEvent({
        address: USDC_POLYGON,
        abi: [parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')],
        eventName: 'Transfer',
        args: {
          to: stealthAddress
        },
        onLogs: async (logs) => {
          for (const log of logs) {
            const { value } = log.args;
            // payment.amount_crypto is assumed to be a decimal string/number
            const expectedAmountBaseUnits = BigInt(Math.floor(payment.amount_crypto * 1e6));
            
            if (value !== undefined && value >= expectedAmountBaseUnits) {
              this.logger.info({ paymentId: payment.id, txHash: log.transactionHash }, 'Polygon payment detected');
              
              const txHash = log.transactionHash;
              let amountReceived = Number(value) / 1e6;

              let swapPayload = null;

              // Handle multi-token swap if payment token is not USDC
              if (payment.token !== 'USDC') {
                this.logger.info({ paymentId: payment.id, token: payment.token }, 'Building unsigned DEX swap to USDC via 1inch');
                const { buildUnsigned1inchSwap } = await import('../swaps/oneinch');
                swapPayload = await buildUnsigned1inchSwap(payment.stealth_address, 'polygon', payment.token, 'USDC', amountReceived);
              }
              
              this.unsubscribe(payment.id);
              await onPaymentConfirmed(
                this.supabase,
                this.logger,
                payment.id,
                txHash,
                amountReceived,
                'polygon',
                swapPayload
              );
            }
          }
        }
      });

      const wrapperUnwatch = () => {
        unwatch();
        clearTimeout(expiry);
      };

      this.subscriptions.set(payment.id, wrapperUnwatch);
      this.logger.info({ paymentId: payment.id, address: payment.stealth_address }, 'Subscribed to Polygon address via Alchemy WSS');
    } catch (err: any) {
      this.logger.error({ paymentId: payment.id, error: err.message }, 'Failed to subscribe to Polygon');
    }
  }

  unsubscribe(paymentId: string) {
    const unwatch = this.subscriptions.get(paymentId);
    if (unwatch) {
      unwatch();
      this.subscriptions.delete(paymentId);
    }
  }

  close() {
    for (const [id] of this.subscriptions) {
      this.unsubscribe(id);
    }
  }
}
