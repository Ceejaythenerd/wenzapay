import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
import { onPaymentConfirmed } from '../confirm';
import type { AppSupabase, AppLogger, PendingPayment } from '../types';

export class SolanaListener {
  private connection: Connection;
  private subscriptions: Map<string, { subId: number, expiry: NodeJS.Timeout }> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private supabase: AppSupabase;
  private logger: AppLogger;

  constructor(supabase: AppSupabase, logger: AppLogger) {
    this.supabase = supabase;
    this.logger = logger;
    
    const rpcUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const wsUrl = process.env.HELIUS_WSS_URL || rpcUrl.replace('https', 'wss').replace('http', 'ws');
    
    this.connection = new Connection(rpcUrl, {
      wsEndpoint: wsUrl,
      commitment: 'confirmed'
    });
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.connection.getSlot();
      } catch (err: any) {
        this.logger.warn({ err: err.message }, 'Solana WS heartbeat failed, connection may be dropped');
      }
    }, 30000);
  }

  subscribe(payment: PendingPayment) {
    if (this.subscriptions.has(payment.id)) return;

    try {
      const pubKey = new PublicKey(payment.stealth_address);
      
      const subId = this.connection.onAccountChange(
        pubKey,
        async (accountInfo, context) => {
          this.logger.info({ paymentId: payment.id, slot: context.slot }, 'Account change detected');
          
          try {
            // Fetch parsed account data to verify exact SPL token transfer
            const parsedInfo = await this.connection.getParsedAccountInfo(pubKey, 'confirmed');
            const data = parsedInfo.value?.data;
            
            if (data && 'parsed' in (data as any)) {
              const parsedData = (data as ParsedAccountData).parsed;
              
              if (parsedData.info && parsedData.info.tokenAmount) {
                const uiAmount = parsedData.info.tokenAmount.uiAmount;
                const mint = parsedData.info.mint;
                
                // Hardcoding mainnet USDC mint for the example
                const isUSDC = mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
                
                if (isUSDC && uiAmount >= payment.amount_crypto) {
                  // Fetch the signatures to get the exact txHash
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  const signatures = await this.connection.getSignaturesForAddress(pubKey, { limit: 1 });
                  const txHash = signatures.length > 0 ? signatures[0].signature : `unresolved_${Date.now()}`;
                  
                  if (signatures.length === 0) {
                    this.logger.warn({ paymentId: payment.id, pubKey: pubKey.toBase58() }, 'No signature found for account change');
                  }
                  let amountReceived = uiAmount;
                  
                  // Handle multi-token swap if payment token is not USDC
                  if (payment.token !== 'USDC') {
                    this.logger.info({ paymentId: payment.id, token: payment.token }, 'Initiating DEX swap to USDC');
                    const { swapOnJupiter } = await import('../swaps/jupiter');
                    
                    if (!payment.custodial_private_key) {
                      throw new Error('Missing custodial private key for Solana DEX swap');
                    }
                    
                    const { decryptData } = await import('@wenzapay/shared');
                    const swapResult = await swapOnJupiter(decryptData(payment.custodial_private_key), payment.token, 'USDC', amountReceived);
                    
                    this.logger.info({ paymentId: payment.id, swapTx: swapResult.txHash }, 'Swap successful');
                    amountReceived = swapResult.amountOut;
                  }

                  this.unsubscribe(payment.id);

                  await onPaymentConfirmed(
                    this.supabase,
                    this.logger,
                    payment.id,
                    txHash,
                    amountReceived,
                    'solana'
                  );
                }
              }
            }
          } catch (e: any) {
            this.logger.error({ err: e.message }, 'Error verifying parsed account info');
          }
        },
        'confirmed'
      );

      const expiry = setTimeout(() => {
        this.logger.info({ paymentId: payment.id }, 'Solana payment subscription expired');
        this.unsubscribe(payment.id);
      }, 60 * 60 * 1000);

      this.subscriptions.set(payment.id, { subId, expiry });
      this.logger.info({ paymentId: payment.id, address: payment.stealth_address }, 'Subscribed to Solana address via Helius WSS');
    } catch (err: any) {
      this.logger.error({ paymentId: payment.id, error: err.message }, 'Failed to subscribe to Solana');
    }
  }

  unsubscribe(paymentId: string) {
    const sub = this.subscriptions.get(paymentId);
    if (sub) {
      this.connection.removeAccountChangeListener(sub.subId);
      clearTimeout(sub.expiry);
      this.subscriptions.delete(paymentId);
    }
  }

  close() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    for (const [id] of this.subscriptions) {
      this.unsubscribe(id);
    }
  }
}
