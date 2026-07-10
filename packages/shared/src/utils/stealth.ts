import { HDKey } from '@scure/bip32';
import crypto from 'crypto';
import bs58 from 'bs58';

/**
 * Derives a stealth address from an xpub (for secp256k1 chains like EVM/Tron).
 * If the xpub is invalid (e.g. during simple testing), falls back to a deterministic hash.
 */
export function deriveStealthAddress(xpub: string, merchantId: string, paymentIndex: number, chain: string) {
  if (chain === 'solana') {
    throw new Error('Solana cannot use non-custodial XPUB derivation due to Ed25519 hardening rules. Use generateCustodialKeypair instead.');
  }

  try {
    const hd = HDKey.fromExtendedKey(xpub);
    const child = hd.deriveChild(paymentIndex);
    
    if (!child.publicKey) throw new Error('No public key');
    
    if (chain === 'polygon') {
      const { bytesToHex, publicKeyToAddress } = require('viem');
      return publicKeyToAddress(bytesToHex(child.publicKey));
    } else if (chain === 'tron') {
      // TODO: convert to base58check properly for Tron. Using viem's publicKeyToAddress and replacing 0x with T for now as a placeholder.
      const { bytesToHex, publicKeyToAddress } = require('viem');
      const evmAddress = publicKeyToAddress(bytesToHex(child.publicKey));
      return 'T' + evmAddress.substring(2);
    }
    
    return Buffer.from(child.publicKey).toString('hex');
  } catch (err) {
    // Fallback for dev testing with invalid xpubs
    const mockHash = crypto.createHash('sha256').update(`${xpub}:${merchantId}:${paymentIndex}:${chain}`).digest('hex');
    if (chain === 'polygon') return `0x${mockHash.substring(0, 40)}`;
    if (chain === 'tron') return `T${mockHash.substring(0, 33)}`;
    return mockHash;
  }
}

/**
 * Generates a temporary custodial keypair for chains that do not support non-custodial XPUB derivation (e.g. Solana).
 */
export function generateCustodialKeypair(chain: string): { address: string; privateKey: string } {
  if (chain === 'solana') {
    // Solana uses Ed25519
    const keypair = crypto.generateKeyPairSync('ed25519');
    
    const pubKeyBytes = keypair.publicKey.export({ format: 'der', type: 'spki' });
    const privKeyBytes = keypair.privateKey.export({ format: 'der', type: 'pkcs8' });
    
    // SPKI DER for Ed25519 has a 12 byte prefix. The last 32 bytes are the raw public key.
    const rawPubKey = pubKeyBytes.subarray(pubKeyBytes.length - 32);
    // PKCS8 DER for Ed25519 has a 16 byte prefix. The last 32 bytes are the raw private key seed.
    const rawPrivKey = privKeyBytes.subarray(privKeyBytes.length - 32);
    
    // Solana's Web3.js Keypair secretKey expects 64 bytes (32 byte seed + 32 byte pubkey)
    const solanaSecretKey = Buffer.concat([rawPrivKey, rawPubKey]);

    return {
      address: bs58.encode(rawPubKey),
      privateKey: bs58.encode(solanaSecretKey)
    };
  }
  
  throw new Error(`Custodial generation not implemented or needed for ${chain}`);
}

export function getDerivationPath(merchantIndex: number, paymentIndex: number, chain: string) {
  if (chain === 'solana') return `m/44'/501'/${merchantIndex}'/${paymentIndex}'`;
  if (chain === 'polygon') return `m/44'/60'/${merchantIndex}'/${paymentIndex}'`;
  if (chain === 'tron') return `m/44'/195'/${merchantIndex}'/${paymentIndex}'`;
  return `m/44'/0'/${merchantIndex}'/${paymentIndex}'`;
}
