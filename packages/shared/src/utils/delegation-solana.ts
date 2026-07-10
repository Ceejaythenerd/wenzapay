import { Connection, PublicKey, Keypair, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { createApproveInstruction, createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import bs58 from 'bs58';

export interface DelegationTransaction {
  chain: 'solana';
  type: 'approve' | 'revoke';
  customerWallet: string;
  merchantId: string;
  amountUsd: number;
  serializedTx: string; // Base64 encoded transaction for the wallet to sign
}

export interface SolanaRecurringChargeResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const WENZAPAY_VAULT = new PublicKey(process.env.WENZAPAY_VAULT_ADDRESS || '11111111111111111111111111111111'); // Placeholder if not set

/**
 * Generates an SPL Token `approve` transaction for the customer to sign.
 * This delegates authority to WenzaPay to pull up to `amountUsd` (converted to USDC).
 */
export async function generateSolanaApprovalTransaction(
  customerWallet: string,
  merchantId: string,
  amountUsd: number
): Promise<DelegationTransaction> {
  const customerPubkey = new PublicKey(customerWallet);
  const customerAta = await getAssociatedTokenAddress(USDC_MINT, customerPubkey);

  const amountBaseUnits = BigInt(Math.floor(amountUsd * 1_000_000));

  const approveIx = createApproveInstruction(
    customerAta,
    WENZAPAY_VAULT,
    customerPubkey,
    amountBaseUnits
  );

  const messageV0 = new TransactionMessage({
    payerKey: customerPubkey,
    recentBlockhash: '11111111111111111111111111111111', // Dummy blockhash for client to replace
    instructions: [approveIx]
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  const serializedTx = Buffer.from(transaction.serialize()).toString('base64');
  
  return {
    chain: 'solana',
    type: 'approve',
    customerWallet,
    merchantId,
    amountUsd,
    serializedTx
  };
}

/**
 * Executes a recurring charge using `transferFrom` equivalent on Solana.
 * Requires the WenzaPay authority keypair to sign the transaction.
 */
export async function executeSolanaRecurringCharge(
  subscriptionId: string,
  customerWallet: string,
  merchantWallet: string,
  amountUsd: number,
  authorityPrivateKey: string // Must be securely fetched from Vault before calling
): Promise<SolanaRecurringChargeResult> {
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
    const authorityKeypair = Keypair.fromSecretKey(bs58.decode(authorityPrivateKey));
    
    const customerPubkey = new PublicKey(customerWallet);
    const merchantPubkey = new PublicKey(merchantWallet);
    
    const customerAta = await getAssociatedTokenAddress(USDC_MINT, customerPubkey);
    const merchantAta = await getAssociatedTokenAddress(USDC_MINT, merchantPubkey);

    const amountBaseUnits = BigInt(Math.floor(amountUsd * 1_000_000));

    // transfer from customer ATA to merchant ATA using the delegated authority (WenzaPay Vault)
    const transferIx = createTransferInstruction(
      customerAta,
      merchantAta,
      authorityKeypair.publicKey,
      amountBaseUnits
    );

    const { blockhash } = await connection.getLatestBlockhash('finalized');

    const messageV0 = new TransactionMessage({
      payerKey: authorityKeypair.publicKey,
      recentBlockhash: blockhash,
      instructions: [transferIx]
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([authorityKeypair]);

    const txHash = await connection.sendTransaction(transaction, {
      maxRetries: 3,
      skipPreflight: false,
    });
    
    return {
      success: true,
      txHash
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generates an SPL Token `revoke` transaction to cancel the delegation.
 */
export async function revokeSolanaApproval(
  customerWallet: string,
  merchantId: string
): Promise<DelegationTransaction> {
  const customerPubkey = new PublicKey(customerWallet);
  const customerAta = await getAssociatedTokenAddress(USDC_MINT, customerPubkey);

  const approveIx = createApproveInstruction(
    customerAta,
    WENZAPAY_VAULT,
    customerPubkey,
    0
  );

  const messageV0 = new TransactionMessage({
    payerKey: customerPubkey,
    recentBlockhash: '11111111111111111111111111111111',
    instructions: [approveIx]
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  const serializedTx = Buffer.from(transaction.serialize()).toString('base64');
  
  return {
    chain: 'solana',
    type: 'revoke',
    customerWallet,
    merchantId,
    amountUsd: 0,
    serializedTx
  };
}
