import crypto from 'crypto';

/**
 * Gets the 256-bit AES key from the environment.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.WENZAPAY_XPUB_ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000';
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts a plaintext string (e.g. private key or xpub) using AES-256-GCM.
 * Returns the format `iv_hex:authTag_hex:ciphertext_hex`.
 */
export function encryptData(plaintext: string): string {
  if (!plaintext) return plaintext;
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Failed to encrypt data', err);
    throw new Error('Internal crypto error');
  }
}

/**
 * Decrypts a ciphertext string in the format `iv_hex:authTag_hex:ciphertext_hex` using AES-256-GCM.
 */
export function decryptData(encrypted: string): string {
  if (!encrypted || !encrypted.includes(':')) return encrypted; // fallback for unencrypted data in dev
  try {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, cipherHex] = encrypted.split(':');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt data', err);
    throw new Error('Internal crypto error');
  }
}
