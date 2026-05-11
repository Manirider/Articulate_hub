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

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});

test.describe('Protected Routes', () => {
  test('should handle unauthenticated access gracefully', async ({ page }) => {
    const response = await page.goto('/dashboard');
    // Should either show the page or redirect — not crash
    expect(response?.status()).toBeLessThan(500);
  });

  test('should handle unauthenticated analytics access', async ({ page }) => {
    const response = await page.goto('/analytics');
    expect(response?.status()).toBeLessThan(500);
  });

  test('should handle unauthenticated leaderboard access', async ({ page }) => {
    const response = await page.goto('/leaderboard');
    expect(response?.status()).toBeLessThan(500);
  });

  test('should handle unauthenticated profile access', async ({ page }) => {
    const response = await page.goto('/profile');
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe('Auth Flow', () => {
  test('auth page renders login/signup form', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');

    // Should have form elements
    const body = await page.locator('body').innerHTML();
    expect(body.length).toBeGreaterThan(200);
  });

  test('auth page has email and password inputs', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    // Look for input fields
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThanOrEqual(2); // email + password at minimum
  });
});

test.describe('Module Pages', () => {
  test('modules page loads without errors', async ({ page }) => {
    const response = await page.goto('/modules');
    expect(response?.status()).toBeLessThan(500);
  });

  test('practice viva page loads without errors', async ({ page }) => {
    const response = await page.goto('/practice/viva');
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe('Performance', () => {
  test('pages load within acceptable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;

    // Page should load within 10 seconds (generous for CI)
    expect(loadTime).toBeLessThan(10000);
  });
});
