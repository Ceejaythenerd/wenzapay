export const PRIVACY_MEMO = "WZ-Pay";

export function getMemoHex(): string {
  return Buffer.from(PRIVACY_MEMO).toString('hex');
}

export function getMemoBuffer(): Buffer {
  return Buffer.from(PRIVACY_MEMO);
}
