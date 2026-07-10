import { describe, it, expect } from 'vitest';
import { getNextBillingDate } from './billing';

describe('Billing Engine', () => {
  describe('getNextBillingDate', () => {
    it('calculates weekly interval correctly', () => {
      const fromDate = new Date('2026-07-01T00:00:00Z');
      const nextDate = getNextBillingDate('weekly', fromDate);
      expect(nextDate.toISOString()).toBe('2026-07-08T00:00:00.000Z');
    });

    it('calculates monthly interval correctly', () => {
      const fromDate = new Date('2026-07-01T00:00:00Z');
      const nextDate = getNextBillingDate('monthly', fromDate);
      expect(nextDate.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    });

    it('calculates annual interval correctly', () => {
      const fromDate = new Date('2026-07-01T00:00:00Z');
      const nextDate = getNextBillingDate('annual', fromDate);
      expect(nextDate.toISOString()).toBe('2027-07-01T00:00:00.000Z');
    });
  });
});
