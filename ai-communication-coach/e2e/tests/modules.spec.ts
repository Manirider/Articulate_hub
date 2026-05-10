import { test, expect } from '@playwright/test';

test.describe('Training Modules', () => {
  test('should load modules-related pages', async ({ page }) => {
    const response = await page.goto('/auth');
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load module detail page without crashing', async ({ page }) => {
    const response = await page.goto('/modules/group-discussion');
    // Accept any non-server-error response (page may redirect if unauthenticated)
    expect(response?.status()).toBeLessThan(500);
  });

  test('should render page elements', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    // Verify the page renders meaningful HTML
    const html = await page.locator('body').innerHTML();
    expect(html.length).toBeGreaterThan(50);
  });
});
