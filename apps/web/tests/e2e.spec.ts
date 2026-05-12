import { test, expect } from '@playwright/test';

test.describe('SME Certificate Trust Platform UI', () => {
  test('landing page loads and title is correct', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SME Certificate Trust Platform/i);
  });

  test('API health endpoint is reachable from the frontend origin', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
