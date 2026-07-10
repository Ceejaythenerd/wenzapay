import { test, expect } from '@playwright/test';

test.describe('Merchant Journey', () => {
  test('should allow merchant dashboard access and verify data load', async ({ page }) => {
    // Mock Supabase Auth Session
    await page.route('**/auth/v1/user*', async route => {
      const json = {
        id: 'mock_merchant_id',
        email: 'test@merchant.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString()
      };
      await route.fulfill({ json });
    });

    // Mock payments fetch in the dashboard
    await page.route('**/rest/v1/payments*', async route => {
      const json = [
        {
          id: 'pay_123',
          merchant_id: 'mock_merchant_id',
          amount_usd: 100,
          chain: 'solana',
          status: 'confirmed',
          created_at: new Date().toISOString()
        }
      ];
      await route.fulfill({ json });
    });

    // Mock API Keys fetch
    await page.route('**/rest/v1/api_keys*', async route => {
      const json = [
        {
          id: 'key_123',
          merchant_id: 'mock_merchant_id',
          prefix: 'wpay_test_',
          created_at: new Date().toISOString()
        }
      ];
      await route.fulfill({ json });
    });

    // We can simulate setting localStorage auth token to bypass login screen if the app uses it
    await page.addInitScript(() => {
      window.localStorage.setItem('sb-your-project-ref-auth-token', JSON.stringify({
        access_token: 'mock_token',
        user: { id: 'mock_merchant_id', email: 'test@merchant.com' }
      }));
    });

    // Navigate to dashboard
    await page.goto('/dashboard/payments');

    // Verify Dashboard UI elements load properly
    await expect(page.locator('h1:has-text("Payments")')).toBeVisible();
    
    // Verify our mocked payment is displayed
    await expect(page.locator('text=$100.00')).toBeVisible();
    await expect(page.locator('text=solana')).toBeVisible();
    await expect(page.locator('text=confirmed')).toBeVisible();
  });
});
