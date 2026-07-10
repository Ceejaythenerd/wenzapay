import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  // In a real environment, use an actual API key generated for the load test
  const apiKey = 'sk_test_mock_key'; 
  
  const payload = JSON.stringify({
    amount: 100,
    currency: 'USD',
    merchant_order_id: `test_${__VU}_${__ITER}`,
    customer_email: 'loadtest@example.com'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
  };

  const res = http.post('http://localhost:3000/api/payments/create', payload, params);
  
  check(res, {
    'is status 200': (r) => r.status === 200,
    'has payment id': (r) => r.json('id') !== undefined,
  });

  sleep(1);
}
