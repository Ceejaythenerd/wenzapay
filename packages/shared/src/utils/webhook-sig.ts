import crypto from 'crypto';

export function signPayload(secret: string, rawBody: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${rawBody}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload);
  return hmac.digest('hex');
}

export function verifySignature(secret: string, rawBody: string, timestamp: number, signature: string, maxAgeSeconds = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > maxAgeSeconds) {
    return false; // Replay attack or delayed payload
  }
  
  const expectedSig = signPayload(secret, rawBody, timestamp);
  return crypto.timingSafeEqual(Buffer.from(expectedSig, 'hex'), Buffer.from(signature, 'hex'));
}
