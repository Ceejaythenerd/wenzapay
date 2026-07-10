---
name: blockchain-listener-fixes
description: >
  Fix blockchain listener issues: mock Solana transaction hashes, invalid EVM stealth address derivation,
  webhook column name mismatch, and mock values in settlement and billing engines.
  Covers audit items #5, #6, #8, #10, and #11.
---

# Blockchain & Listener Fixes Agent

## Assigned Audit Items

| # | Severity | Issue |
|---|----------|-------|
| 5 | 🔴 CRITICAL | Mock transaction hash in Solana listener |
| 6 | 🟠 HIGH | Stealth address derivation is cryptographically incorrect |
| 8 | 🟠 HIGH | `webhook_endpoints.enabled` vs `is_active` column mismatch |
| 10 | 🟠 HIGH | Settlement engine uses hardcoded `mock_bank_acc_123` |
| 11 | 🟠 HIGH | Billing engine uses `mockAuthorityKey` |

---

## Task 1: Replace Mock Solana Transaction Hash (Audit #5)

### Context
`services/listener/src/chains/solana.ts` line 63 generates a fake hash:
```typescript
const txHash = `mock_sol_tx_${Date.now()}`;
```

### Steps
1. Open `services/listener/src/chains/solana.ts`.
2. After detecting the account change and verifying the USDC amount, fetch the real transaction:
```typescript
const signatures = await this.connection.getSignaturesForAddress(pubKey, { limit: 1 });
const txHash = signatures.length > 0 ? signatures[0].signature : `unresolved_${Date.now()}`;
```
3. Add a 2-second delay before fetching signatures (the transaction may not be indexed immediately):
```typescript
await new Promise(resolve => setTimeout(resolve, 2000));
```
4. Log a warning if no signature is found.

### Verification
- In test mode, create a payment and send USDC to the stealth address on devnet.
- Confirm the `tx_hash` in the database is a valid Solana signature (base58, 88 chars).

---

## Task 2: Fix EVM Stealth Address Derivation (Audit #6)

### Context
`packages/shared/src/utils/stealth.ts` truncates raw public key bytes to 40 hex chars.
A valid Ethereum address requires `keccak256(uncompressedPublicKey)[12:]`.

### Steps
1. Open `packages/shared/src/utils/stealth.ts`.
2. Add a dependency on `viem` (already in `packages/shared/package.json`):
```typescript
import { keccak256 } from 'viem';
```
3. Replace the Polygon derivation logic:
```typescript
if (chain === 'polygon') {
  // Remove the 0x04 prefix from the uncompressed public key
  const uncompressedKey = child.publicKey;
  // keccak256 hash, take last 20 bytes
  const hash = keccak256(Buffer.from(uncompressedKey).slice(1)); // Remove prefix byte
  return '0x' + hash.slice(-40);
}
```
4. For Tron, the address derivation is similar but uses a different prefix and checksum.
   For now, use the same keccak256 approach but convert to Tron's base58check format,
   or mark it as a TODO with a clear comment.

### Verification
- Write a unit test in `packages/shared/src/utils/stealth.test.ts` that:
  - Derives an address from a known xpub and payment index.
  - Validates the result is a checksummed Ethereum address (starts with `0x`, 42 chars).
  - Validates the address can be verified on-chain (e.g. via `isAddress()` from viem).

---

## Task 3: Fix Webhook Column Name Mismatch (Audit #8)

### Context
The DB schema defines `webhook_endpoints.enabled`, but `services/listener/src/webhook.ts`
queries `.eq('is_active', true)`.

### Steps
1. Open `services/listener/src/webhook.ts`.
2. Change line 25:
```diff
-    .eq('is_active', true);
+    .eq('enabled', true);
```

### Verification
- Create a webhook endpoint via the dashboard.
- Trigger a payment confirmation.
- Confirm the webhook delivery record is created in `webhook_deliveries`.

---

## Task 4: Replace Mock Bank ID in Settlement (Audit #10)

### Context
`services/listener/src/settlement.ts` hardcodes `'mock_bank_acc_123'`.

### Steps
1. Open `services/listener/src/settlement.ts`.
2. Replace the hardcoded bank ID with a lookup from `merchant_settings`:
```typescript
// Fetch the merchant's configured bank account from offramp_splits
const splits = setting.offramp_splits;
if (!splits || splits.length === 0) {
  logger.warn({ merchantId: setting.merchant_id }, 'No offramp splits configured, skipping settlement');
  continue;
}
const bankId = splits[0].destination;
```
3. Add validation that `bankId` is not empty before calling `initiateBridgeSettlement`.

### Verification
- Confirm that merchants without configured `offramp_splits` are gracefully skipped.
- Confirm that merchants with configured splits have their `destination` used as the bank ID.

---

## Task 5: Replace Mock Authority Key in Billing (Audit #11)

### Context
`services/listener/src/billing.ts` uses `'mock_wenzapay_authority_key'`.

### Steps
1. Open `services/listener/src/billing.ts`.
2. Replace with an environment variable read:
```typescript
const authorityKey = process.env.WENZAPAY_AUTHORITY_PRIVATE_KEY;
if (!authorityKey) {
  throw new Error('WENZAPAY_AUTHORITY_PRIVATE_KEY is not configured. Cannot execute recurring charges.');
}
```
3. Add `WENZAPAY_AUTHORITY_PRIVATE_KEY` to `.env.example` with a placeholder.
4. In the `handleBillingFailure` function, ensure the error message from missing key is captured cleanly.

### Verification
- Confirm that if `WENZAPAY_AUTHORITY_PRIVATE_KEY` is not set, the billing engine logs an error but does not crash the entire listener service.
