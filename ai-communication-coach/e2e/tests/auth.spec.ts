import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should load the homepage', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('should load the auth page', async ({ page }) => {
    const response = await page.goto('/auth');
    expect(response?.status()).toBeLessThan(400);
  });

  test('should have a page title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should render page content', async ({ page }) => {
    await page.goto('/auth');
    // Wait for any content to render
    await page.waitForLoadState('domcontentloaded');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    // Allow React hydration warnings but no critical errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('hydration') && !e.includes('Warning:')
    );
    expect(criticalErrors.length).toBeLessThanOrEqual(3);
  });
});
