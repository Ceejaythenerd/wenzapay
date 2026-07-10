import { encodeFunctionData, parseUnits, createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

/**
 * Utilities for EVM ERC-20 delegation and transfer.
 */

export interface EVMDelegationTransaction {
  chain: 'polygon' | 'tron';
  type: 'approve' | 'revoke';
  customerWallet: string;
  merchantId: string;
  amountUsd: number;
  transactionData: {
    to: string; // Contract address (e.g. USDC)
    data: string; // Hex encoded ABI call
    value: string; // "0"
  };
}

export interface EVMRecurringChargeResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

const erc20Abi = [
  {
    "constant": false,
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "_from", "type": "address" },
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  }
] as const;

const USDC_POLYGON = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const WENZAPAY_VAULT_ADDRESS = (process.env.WENZAPAY_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

/**
 * Generates an ERC-20 `approve` transaction for the customer to sign.
 * This delegates authority to WenzaPay to pull up to `amountUsd`.
 */
export async function generateEVMApprovalTransaction(
  chain: 'polygon' | 'tron',
  customerWallet: string,
  merchantId: string,
  amountUsd: number
): Promise<EVMDelegationTransaction> {
  const amountBaseUnits = parseUnits(amountUsd.toString(), 6);

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [WENZAPAY_VAULT_ADDRESS, amountBaseUnits]
  });
  
  return {
    chain,
    type: 'approve',
    customerWallet,
    merchantId,
    amountUsd,
    transactionData: {
      to: chain === 'polygon' ? USDC_POLYGON : '0x0', // tron handling omitted for brevity
      data,
      value: '0'
    }
  };
}

/**
 * Executes a recurring charge using ERC-20 `transferFrom`.
 * Requires the WenzaPay authority private key to sign the transaction.
 */
export async function executeEVMRecurringCharge(
  chain: 'polygon' | 'tron',
  subscriptionId: string,
  customerWallet: string,
  merchantWallet: string,
  amountUsd: number,
  authorityPrivateKey: string // Must be securely fetched from Vault before calling
): Promise<EVMRecurringChargeResult> {
  try {
    if (chain !== 'polygon') {
      throw new Error('Only Polygon EVM is implemented for this example');
    }

    const account = privateKeyToAccount(authorityPrivateKey as `0x${string}`);
    const client = createWalletClient({
      account,
      chain: polygon,
      transport: http(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com')
    }).extend(publicActions);

    const amountBaseUnits = parseUnits(amountUsd.toString(), 6);

    const txHash = await client.writeContract({
      address: USDC_POLYGON,
      abi: erc20Abi,
      functionName: 'transferFrom',
      args: [customerWallet as `0x${string}`, merchantWallet as `0x${string}`, amountBaseUnits],
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
 * Generates an ERC-20 `approve(spender, 0)` transaction to cancel the delegation.
 */
export async function revokeEVMApproval(
  chain: 'polygon' | 'tron',
  customerWallet: string,
  merchantId: string
): Promise<EVMDelegationTransaction> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [WENZAPAY_VAULT_ADDRESS, BigInt(0)]
  });

  return {
    chain,
    type: 'revoke',
    customerWallet,
    merchantId,
    amountUsd: 0,
    transactionData: {
      to: chain === 'polygon' ? USDC_POLYGON : '0x0',
      data,
      value: '0'
    }
  };
}
