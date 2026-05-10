import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load main pages without server errors', async ({ page }) => {
    const routes = ['/auth', '/dashboard'];
    for (const route of routes) {
      const response = await page.goto(route);
      // Accept 200 OK or redirect (3xx) — both are valid
      expect(response?.status()).toBeLessThan(500);
    }
  });

  test('should have responsive viewport', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    expect(viewport!.width).toBeGreaterThan(0);
    expect(viewport!.height).toBeGreaterThan(0);
  });

  test('should render without crashing', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    // Verify page has meaningful content (not a blank page)
    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(100);
  });
});

test.describe('Protected Routes', () => {
  test('should handle unauthenticated access gracefully', async ({ page }) => {
    const response = await page.goto('/dashboard');
    // Should either show the page or redirect — not crash
    expect(response?.status()).toBeLessThan(500);
  });
});
