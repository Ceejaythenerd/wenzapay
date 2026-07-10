export interface MerchantRule {
  field: string;
  operator: string;
  value: any;
  action: 'allow' | 'review' | 'hold' | 'block';
}

const ACTION_WEIGHTS = {
  'allow': 0,
  'hold': 1,
  'review': 2,
  'block': 3
};

export function applyMerchantRules(
  paymentData: { amount: number; country?: string; walletAgeDays?: number }, 
  rules: MerchantRule[], 
  baseAction: 'allow' | 'review' | 'hold' | 'block'
): { action: 'allow' | 'review' | 'hold' | 'block'; triggeredRules: MerchantRule[] } {
  let highestAction = baseAction;
  const triggeredRules: MerchantRule[] = [];

  for (const rule of rules) {
    let triggered = false;
    
    // Extrapolate field value
    let fieldValue = undefined;
    if (rule.field === 'amount') fieldValue = paymentData.amount;
    else if (rule.field === 'country') fieldValue = paymentData.country;
    else if (rule.field === 'wallet_age_days') fieldValue = paymentData.walletAgeDays;

    if (fieldValue !== undefined) {
      switch (rule.operator) {
        case 'eq':
          triggered = fieldValue === rule.value;
          break;
        case 'gt':
          triggered = fieldValue > rule.value;
          break;
        case 'lt':
          triggered = fieldValue < rule.value;
          break;
        case 'in':
          triggered = Array.isArray(rule.value) && rule.value.includes(fieldValue);
          break;
      }
    }

    if (triggered) {
      triggeredRules.push(rule);
      if (ACTION_WEIGHTS[rule.action] > ACTION_WEIGHTS[highestAction]) {
        highestAction = rule.action;
      }
    }
  }

  return { action: highestAction, triggeredRules };
}
