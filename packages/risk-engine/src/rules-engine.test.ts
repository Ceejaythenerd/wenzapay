import { describe, it, expect } from 'vitest';
import { applyMerchantRules, MerchantRule } from './rules-engine';

describe('applyMerchantRules', () => {
  it('returns base action if no rules are triggered', () => {
    const rules: MerchantRule[] = [
      { field: 'amount', operator: 'gt', value: 1000, action: 'review' }
    ];
    const result = applyMerchantRules({ amount: 500 }, rules, 'allow');
    expect(result.action).toBe('allow');
    expect(result.triggeredRules).toHaveLength(0);
  });

  it('triggers higher severity rule', () => {
    const rules: MerchantRule[] = [
      { field: 'amount', operator: 'gt', value: 1000, action: 'review' },
      { field: 'country', operator: 'in', value: ['US'], action: 'block' }
    ];
    const result = applyMerchantRules({ amount: 1500, country: 'US' }, rules, 'allow');
    expect(result.action).toBe('block');
    expect(result.triggeredRules).toHaveLength(2);
  });

  it('evaluates eq operator correctly', () => {
    const rules: MerchantRule[] = [
      { field: 'country', operator: 'eq', value: 'CA', action: 'hold' }
    ];
    const result = applyMerchantRules({ amount: 100, country: 'CA' }, rules, 'allow');
    expect(result.action).toBe('hold');
  });
});
