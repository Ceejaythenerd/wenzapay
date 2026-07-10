// Real integration with CoinCap API for live prices
let cachedPrices: Record<string, number> = {
  'SOL': 145.0,
  'MATIC': 0.55,
  'TRX': 0.12,
  'USDC': 1.0,
  'USDT': 1.0,
};
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

const COINCAP_IDS = 'solana,polygon,tron,usd-coin,tether';

export async function getPrice(symbol: string): Promise<number> {
  const sym = symbol.toUpperCase();
  const now = Date.now();

  if (now - lastFetchTime < CACHE_TTL) {
    return cachedPrices[sym] || 0;
  }

  try {
    const response = await fetch(`https://api.coincap.io/v2/assets?ids=${COINCAP_IDS}`);
    if (!response.ok) {
      throw new Error(`CoinCap API failed: ${response.statusText}`);
    }
    
    const json = await response.json();
    for (const asset of json.data) {
      // CoinCap symbol for polygon is MATIC
      const assetSymbol = asset.symbol.toUpperCase();
      cachedPrices[assetSymbol] = parseFloat(asset.priceUsd);
    }
    
    lastFetchTime = now;

    const STABLECOINS = ['USDC', 'USDT'];
    for (const stable of STABLECOINS) {
      const p = cachedPrices[stable];
      if (p && Math.abs(p - 1.0) > 0.02) {
        console.warn(`[PriceFeed] ⚠️ Stablecoin ${stable} depeg detected: $${p.toFixed(4)}`);
      }
    }
  } catch (error) {
    console.warn('[PriceFeed] Failed to fetch live prices, using cache', error);
  }

  return cachedPrices[sym] || 0;
}

export function isStablecoinHealthy(symbol: string): boolean {
  const price = cachedPrices[symbol.toUpperCase()];
  if (!price) return true; // Can't evaluate, assume ok or let main check fail
  return Math.abs(price - 1.0) <= 0.02;
}

export async function getQuote(amountUsd: number, symbol: string): Promise<number> {
  const price = await getPrice(symbol);
  if (price === 0) throw new Error(`Price feed unavailable for ${symbol}`);
  
  // Return the amount of tokens needed to cover amountUsd
  return amountUsd / price;
}
