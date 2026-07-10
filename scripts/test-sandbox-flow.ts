/**
 * Test Sandbox Flow
 * Run with: npx tsx scripts/test-sandbox-flow.ts
 */

const API_BASE = 'http://localhost:3000';
// Replace with a valid test key from your database for testing
const TEST_API_KEY = 'wpay_test_demo123'; 

async function main() {
  console.log('1. Creating sandbox payment...');
  const createRes = await fetch(`${API_BASE}/api/payments/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_API_KEY}`
    },
    body: JSON.stringify({
      amount: 49.99,
      chain: 'solana',
      ref: 'test_order_777'
    })
  });

  const payment = await createRes.json();
  if (!createRes.ok) {
    console.error('Failed to create payment:', payment);
    return;
  }

  console.log('Payment created:', payment);
  const paymentId = payment.id;

  console.log('2. Polling for status...');
  let status = 'pending';
  while (status === 'pending') {
    const statusRes = await fetch(`${API_BASE}/api/payments/${paymentId}/status`);
    const statusData = await statusRes.json();
    status = statusData.status;
    console.log(`Current status: ${status}`);
    
    if (status === 'pending') {
      console.log('Waiting 2 seconds...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`Flow complete! Final status: ${status}`);
}

main().catch(console.error);
