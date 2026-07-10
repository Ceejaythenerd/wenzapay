import { createWalletClient, http } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import * as viemChains from 'viem/chains';

export async function buildUnsigned1inchSwap(
  merchantAddress: string,
  chain: string,
  inputToken: string,
  outputToken: string,
  amountIn: number
): Promise<{ txData: string; txTo: string; txValue: string; amountOut: number }> {
  console.log(`[1inch Swap] Fetching route: ${amountIn} ${inputToken} to ${outputToken} on ${chain}`);
  
  const chainIdMap: Record<string, string> = {
    'polygon': '137',
    'ethereum': '1',
    'arbitrum': '42161',
    'base': '8453'
  };

  const chainId = chainIdMap[chain.toLowerCase()];
  if (!chainId) {
    throw new Error(`[1inch Swap] Chain ${chain} not supported by 1inch.`);
  }

  // Example dummy tokens for Polygon
  const tokenMap: Record<string, string> = {
    'USDC': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    'MATIC': '0x0000000000000000000000000000000000001010' // 1inch native token representation
  };

  const inToken = tokenMap[inputToken] || inputToken;
  const outToken = tokenMap[outputToken] || outputToken;

  try {
    const apiKey = process.env.ONEINCH_API_KEY;
    if (!apiKey) {
      throw new Error('ONEINCH_API_KEY environment variable is missing.');
    }

    const amountWei = Math.floor(amountIn * 10 ** 18).toString(); // Assuming 18 decimals for simulation

    // 1inch Swap endpoint
    const url = `https://api.1inch.dev/swap/v6.0/${chainId}/swap?src=${inToken}&dst=${outToken}&amount=${amountWei}&from=${merchantAddress}&slippage=1`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`1inch swap failed: ${response.statusText} - ${await response.text()}`);
    }

    const data = await response.json();
    const amountOut = parseInt(data.dstAmount, 10) / 10 ** 6; // Assuming 6 decimals out
    const tx = data.tx;
    
    console.log(`[1inch Swap] Successfully built unsigned transaction for ${merchantAddress}`);
    
    return {
      txData: tx.data,
      txTo: tx.to,
      txValue: tx.value,
      amountOut
    };
    
  } catch (error: any) {
    console.error(`[1inch Swap] Error:`, error.message);
    throw error;
  }
}
