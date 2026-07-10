export enum SaasTier {
  FREE = "free",       // Sandbox only
  STARTER = "starter", // 1% transaction fee
  PRO = "pro",         // $99/mo + 0.5% fee
  ENTERPRISE = "enterprise" // Custom
}

export interface BillingDetails {
  tier: SaasTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  isActive: boolean;
  cancelAtPeriodEnd: boolean;
}

export const SAAS_TIER_LIMITS = {
  [SaasTier.FREE]: {
    maxMonthlyVolume: 0,
    feePercentage: 0,
    sandboxOnly: true,
  },
  [SaasTier.STARTER]: {
    maxMonthlyVolume: 100000,
    feePercentage: 1.0,
    sandboxOnly: false,
  },
  [SaasTier.PRO]: {
    maxMonthlyVolume: 1000000,
    feePercentage: 0.5,
    sandboxOnly: false,
  },
  [SaasTier.ENTERPRISE]: {
    maxMonthlyVolume: Infinity,
    feePercentage: 0.1, // Custom
    sandboxOnly: false,
  },
};
