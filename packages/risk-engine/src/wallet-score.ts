export async function scoreWallet(senderWallet: string | undefined, chain: string): Promise<{ score: number; signals: Record<string, any> }> {
  let score = 0;
  const signals: Record<string, any> = { matchReasons: [] as string[] };

  if (!senderWallet) {
    return { score: 10, signals: { error: 'No sender wallet provided (unknown)' } };
  }

  // Real implementation using direct JSON-RPC calls (avoiding heavy SDK dependencies in risk-engine)
  let isNew = false;

  try {
    if (chain === 'solana') {
      const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSignaturesForAddress",
          params: [senderWallet, { limit: 1 }]
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result && json.result.length === 0) isNew = true;
      }
    } else if (chain === 'polygon' || chain === 'ethereum' || chain === 'base' || chain === 'arbitrum') {
      const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionCount",
          params: [senderWallet, "latest"]
        })
      });
      if (res.ok) {
        const json = await res.json();
        // A nonce of "0x0" indicates no outgoing transactions
        if (json.result === '0x0') isNew = true;
      }
    } else if (chain === 'tron') {
      const url = `https://api.trongrid.io/v1/accounts/${senderWallet}/transactions?limit=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        if (!json.data || json.data.length === 0) isNew = true;
      }
    }
  } catch (err) {
    console.warn(`[RiskEngine] Failed to query blockchain for wallet ${senderWallet} on ${chain}`, err);
    // Fail closed for risk Engine? No, fail open to avoid blocking legitimate payments if RPC is down
  }

  if (isNew) {
    score += 30;
    signals.matchReasons.push('wallet_age_new_or_no_txs');
  }

  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, score));

  return { score, signals };
}
