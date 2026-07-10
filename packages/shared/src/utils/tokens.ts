export interface TokenInfo {
  symbol: string;
  name: string;
  chain: string;
  address: string;
  decimals: number;
}

// Supported tokens for swaps
export const SUPPORTED_TOKENS: TokenInfo[] = [
  { symbol: 'USDC', name: 'USD Coin', chain: 'solana', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  { symbol: 'SOL', name: 'Solana', chain: 'solana', address: 'So11111111111111111111111111111111111111112', decimals: 9 },
  { symbol: 'BONK', name: 'Bonk', chain: 'solana', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5 },
  
  { symbol: 'USDC', name: 'USD Coin', chain: 'polygon', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
  { symbol: 'MATIC', name: 'Polygon', chain: 'polygon', address: '0x0000000000000000000000000000000000001010', decimals: 18 },
  
  { symbol: 'USDT', name: 'Tether USD', chain: 'tron', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6 },
  { symbol: 'TRX', name: 'Tron', chain: 'tron', address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', decimals: 6 },
];

export function getTokensForChain(chain: string): TokenInfo[] {
  return SUPPORTED_TOKENS.filter(t => t.chain === chain);
}
