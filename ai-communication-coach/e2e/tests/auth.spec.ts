import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display splash page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AI Communication Coach/);
    await expect(page.locator('text=Initializing AI systems')).toBeVisible();
  });

  test('should navigate to auth page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('text=Sign in to continue')).toBeVisible();
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('should show signup form', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=Sign Up');
    await expect(page.locator('input[placeholder="Full Name"]')).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=Sign Up');
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('weak');
    
    await expect(page.locator('text=Very Weak')).toBeVisible();
  });
});
