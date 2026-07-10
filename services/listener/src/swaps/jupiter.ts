import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

export async function swapOnJupiter(
  privateKey: string, // Mock or real base58 key
  inputToken: string,
  outputToken: string,
  amountIn: number
): Promise<{ txHash: string; amountOut: number }> {
  console.log(`[Jupiter Swap] Fetching route: ${amountIn} ${inputToken} to ${outputToken}`);

  // Note: For a real app, inputToken and outputToken should be the SPL token mint addresses.
  // We'll assume inputToken/outputToken are already mint addresses or we map them.
  // Example dummy mints if "USDC" is passed:
  const tokenMap: Record<string, string> = {
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
    'SOL': 'So11111111111111111111111111111111111111112' // WSOL
  };
  
  const inMint = tokenMap[inputToken] || inputToken;
  const outMint = tokenMap[outputToken] || outputToken;

  try {
    // 1. Fetch Quote
    // Amount in Jupiter API is in native decimals (e.g., 1 USDC = 1_000_000)
    // We assume amountIn is in standard units for this example, we'll convert assuming 6 decimals for simplicity.
    const amountLamports = Math.floor(amountIn * 1_000_000).toString();
    
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inMint}&outputMint=${outMint}&amount=${amountLamports}&slippageBps=50`;
    const quoteResponse = await fetch(quoteUrl);
    
    if (!quoteResponse.ok) {
      throw new Error(`Jupiter quote failed: ${quoteResponse.statusText}`);
    }
    
    const quoteData = await quoteResponse.json();
    const amountOut = parseInt(quoteData.outAmount, 10) / 1_000_000;
    
    // 2. Fetch Swap Transaction
    const userKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    const userPubkey = userKeypair.publicKey.toBase58();
    
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: userPubkey,
        wrapAndUnwrapSol: true,
      })
    });

    if (!swapResponse.ok) {
      throw new Error(`Jupiter swap failed: ${swapResponse.statusText}`);
    }

    const swapData = await swapResponse.json();
    
    // 3. Broadcast
    const { swapTransaction } = swapData;
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    transaction.sign([userKeypair]);

    const connection = new Connection(process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const rawTransaction = transaction.serialize();
    
    // Attempt to broadcast. If using a dummy keypair, this will throw an error
    const txHash = await connection.sendRawTransaction(rawTransaction, { skipPreflight: false });
    
    console.log(`[Jupiter Swap] Successfully broadcasted transaction: ${txHash}`);
    
    return {
      txHash,
      amountOut
    };

  } catch (error: any) {
    console.error(`[Jupiter Swap] Error:`, error.message);
    throw error;
  }
}
