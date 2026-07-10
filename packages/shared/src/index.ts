import { z } from 'zod';

export const PaymentCreateSchema = z.object({
  amount: z.number().positive(),
  chain: z.enum(['solana', 'tron', 'polygon']),
  ref: z.string().optional(),
  fingerprintData: z.any().optional(),
});

export type PaymentCreateRequest = z.infer<typeof PaymentCreateSchema>;

export type Merchant = {
  id: string;
  email: string;
  businessName: string;
};

// Utils
export * from './utils/stealth';
export * from './utils/ledger';
export * from './utils/webhook-sig';
export * from './utils/price-feed';
export * from './utils/tokens';
export * from './utils/delegation-solana';
export * from './utils/delegation-evm';
export * from './billing';
export * from './database.types';
export * from './utils/encryption';
