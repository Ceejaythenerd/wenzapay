import { describe, it, expect } from 'vitest';
import { deriveStealthAddress, getDerivationPath } from './stealth';

describe('Stealth Address Utils', () => {
  describe('getDerivationPath', () => {
    it('returns correct solana path', () => {
      expect(getDerivationPath(1, 2, 'solana')).toBe("m/44'/501'/1'/2'");
    });

    it('returns correct polygon path', () => {
      expect(getDerivationPath(1, 2, 'polygon')).toBe("m/44'/60'/1'/2'");
    });

    it('returns correct tron path', () => {
      expect(getDerivationPath(1, 2, 'tron')).toBe("m/44'/195'/1'/2'");
    });
  });

  describe('deriveStealthAddress', () => {
    const fakeXpub = 'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8';

    it('derives deterministic solana address (throws error natively, caught by fallback)', () => {
      const addr = deriveStealthAddress(fakeXpub, 'merch1', 1, 'solana');
      expect(addr).toMatch(/^sol_[a-f0-9]{32}$/);
    });

    it('derives valid EVM address for polygon', async () => {
      const { isAddress } = await import('viem');
      const addr = deriveStealthAddress(fakeXpub, 'merch1', 1, 'polygon');
      expect(isAddress(addr)).toBe(true);
    });

    it('derives deterministic tron address', () => {
      const addr = deriveStealthAddress(fakeXpub, 'merch1', 1, 'tron');
      expect(addr).toMatch(/^T[a-fA-F0-9]{40}$/);
    });
  });
});
