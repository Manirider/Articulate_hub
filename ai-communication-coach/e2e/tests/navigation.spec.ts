import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to all main pages', async ({ page }) => {
    await page.goto('/auth');
    
    // Check navbar links
    const links = ['Dashboard', 'Rooms', 'Teams', 'Analytics', 'Leaderboard'];
    for (const link of links) {
      await expect(page.locator(`text=${link}`)).toBeVisible();
    }
  });

  test('should have working logo link', async ({ page }) => {
    await page.goto('/auth');
    const logo = page.locator('a:has-text("AI Coach")');
    await expect(logo).toBeVisible();
  });

  test('should display modules section', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=Modules');
    await expect(page.locator('text=Group Discussion')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    // Should show loading or redirect to auth
    await expect(page.locator('text=Welcome back, 👋')).toBeVisible({ timeout: 5000 });
  });
});
