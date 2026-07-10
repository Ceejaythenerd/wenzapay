import { scoreFingerprint, FingerprintData } from './fingerprint';
import { checkVelocity } from './velocity';
import { scoreWallet } from './wallet-score';
import { applyMerchantRules, MerchantRule } from './rules-engine';

export interface PaymentContext {
  merchantId: string;
  amount: number;
  ip: string;
  chain: string;
  senderWallet?: string;
  fingerprintData?: FingerprintData;
  merchantRules?: MerchantRule[];
}

export interface RiskResult {
  score: number;
  action: 'allow' | 'review' | 'hold' | 'block';
  signals: Record<string, any>;
}

export async function scorePayment(ctx: PaymentContext): Promise<RiskResult> {
  const [fp, vel, wallet] = await Promise.all([
    ctx.fingerprintData ? scoreFingerprint(ctx.fingerprintData) : { score: 0, signals: { error: 'No fingerprint' } },
    checkVelocity(ctx.ip, ctx.merchantId, ctx.amount),
    scoreWallet(ctx.senderWallet, ctx.chain),
  ]);
  
  // Base scoring
  const totalScore = Math.min(100, (fp.score as number) + (vel.score as number) + (wallet.score as number));
  
  let baseAction: 'allow' | 'review' | 'hold' | 'block' = 
    totalScore >= 80 ? 'block' :
    totalScore >= 60 ? 'review' :
    totalScore >= 40 ? 'hold' :
    'allow';
  
  const signals: Record<string, any> = { fp, vel, wallet };

  // Apply merchant overrides
  let finalAction = baseAction;
  if (ctx.merchantRules && ctx.merchantRules.length > 0) {
    const override = applyMerchantRules({ amount: ctx.amount }, ctx.merchantRules, baseAction);
    finalAction = override.action;
    signals['merchant_rules'] = override.triggeredRules;
  }

  return { score: totalScore, action: finalAction, signals };
}

export * from './fingerprint';
export * from './velocity';
export * from './wallet-score';
export * from './rules-engine';
export * from './geo';
