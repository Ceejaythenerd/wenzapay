---
name: security-hardening
description: >
  Fix critical security vulnerabilities in WenzaPay: plaintext custodial private keys in the database,
  leaked Supabase service role key in Git history, and hardcoded API key pepper fallback.
  Trigger when addressing audit items #1, #2, or #4.
---

# Security Hardening Agent

## Assigned Audit Items

| # | Severity | Issue |
|---|----------|-------|
| 1 | 🔴 CRITICAL | Private key stored in plaintext in the `payments` table |
| 2 | 🔴 CRITICAL | `SUPABASE_SERVICE_ROLE_KEY` committed to Git history |
| 4 | 🔴 CRITICAL | API key pepper hardcoded as a fallback default |

---

## Task 1: Encrypt Custodial Private Keys (Audit #1)

### Context
`apps/web/lib/crypto/address-registry.ts` returns `custodialPrivateKey` as plaintext, and
`apps/web/app/api/payments/create/route.ts` inserts it directly into the `payments.custodial_private_key` column.

### Steps
1. Open `apps/web/lib/crypto/address-registry.ts`.
2. Create a new utility function `encryptPrivateKey(key: string): string` that uses `crypto.createCipheriv('aes-256-gcm', ...)` with `process.env.WENZAPAY_XPUB_ENCRYPTION_KEY` (the same key used for xpub encryption, or a separate dedicated key).
3. The function should return the format: `iv_hex:authTag_hex:ciphertext_hex`.
4. Wrap the returned `custodialPrivateKey` through this function before returning from `generateStealthAddressForPayment`.
5. Create a corresponding `decryptPrivateKey(encrypted: string): string` function (for use by the listener service when it needs to sign Solana transactions).
6. Update `services/listener/src/chains/solana.ts` to decrypt the key before using it for Jupiter swaps.

### Verification
- Write a unit test that encrypts and decrypts a known key and asserts roundtrip correctness.
- Ensure the `payments` table never stores a raw base58 private key.

---

## Task 2: Rotate Leaked Supabase Service Role Key (Audit #2)

### Context
The `.env` file containing a real `SUPABASE_SERVICE_ROLE_KEY` JWT was pushed to Git history.

### Steps
1. Verify `.env` is in `.gitignore` (it is, but confirm).
2. Run `git rm --cached .env` if `.env` is currently tracked.
3. Instruct the user to go to the Supabase dashboard → Project Settings → API and **regenerate the service role key**.
4. Update the local `.env` with the new key.
5. Search Git history for other sensitive values: `git log --all -p -- .env`

### Verification
- Run `git status` and confirm `.env` is not tracked.
- Run `git log --all --oneline -- .env` to verify it's removed from future commits.

> **NOTE**: You cannot purge the key from existing Git history without a force push and `git filter-repo`. Alert the user about this.

---

## Task 3: Remove Hardcoded API Key Pepper (Audit #4)

### Context
`apps/web/lib/crypto/api-keys.ts` line 4:
```typescript
const pepper = process.env.API_KEY_PEPPER || 'wenzapay-default-pepper-123';
```

### Steps
1. Open `apps/web/lib/crypto/api-keys.ts`.
2. Replace the fallback with a hard error:
```typescript
const pepper = process.env.API_KEY_PEPPER;
if (!pepper) throw new Error('FATAL: API_KEY_PEPPER environment variable is not set.');
```
3. Add `API_KEY_PEPPER=your-secret-pepper-here` to `.env.example`.
4. Generate a real pepper value and add it to the local `.env`.

### Verification
- Remove `API_KEY_PEPPER` from `.env` temporarily and confirm the app throws on startup.
- Restore and confirm key generation works.
