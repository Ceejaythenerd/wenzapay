import { test, expect } from '@playwright/test';

test.describe('Widget Checkout Flow', () => {
  test('should complete a mock checkout flow', async ({ page }) => {
    // 1. We mock the /api/payments/create endpoint to return a test payment session
    await page.route('**/api/payments/create', async route => {
      await route.fulfill({
        json: {
          id: 'pay_widget_123',
          stealth_address: '0xmockstealthaddress1234567890',
          amount_crypto: 50.0,
          token: 'USDC',
          chain: 'polygon',
          status: 'pending'
        }
      });
    });

    // 2. We mock the Supabase realtime polling or the GET payment endpoint
    await page.route('**/rest/v1/payments?id=eq.pay_widget_123*', async route => {
      // Simulate that after some polling, it becomes confirmed
      await route.fulfill({
        json: [
          {
            id: 'pay_widget_123',
            status: 'confirmed'
          }
        ]
      });
    });

    // Navigate to a demo page that embeds the widget
    // Since the widget runs in an iframe or shadow DOM, we'll test the demo page route
    await page.goto('/demo');

    // Select Network (e.g., Polygon)
    await page.click('button:has-text("Polygon")');

    // Wait for address to be generated and displayed
    await expect(page.locator('text=Send exactly')).toBeVisible();
    await expect(page.locator('text=50 USDC')).toBeVisible();
    await expect(page.locator('text=0xmockstealthaddress1234567890')).toBeVisible();

    // Since we mocked the polling to return 'confirmed', the UI should transition to success
    await expect(page.locator('text=Payment Confirmed!')).toBeVisible({ timeout: 10000 });
  });
});
