import { test, expect } from '@playwright/test';

test.describe('Training Modules', () => {
  test('should display all 5 modules', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=Modules');
    
    const modules = [
      'Group Discussion',
      'Debate',
      'Presentation',
      'JAM',
      'Interview'
    ];
    
    for (const module of modules) {
      await expect(page.locator(`text=${module}`)).toBeVisible();
    }
  });

  test('should show practice modes', async ({ page }) => {
    await page.goto('/modules/group-discussion');
    
    const modes = ['Demo Mode', 'Personal Practice', 'AI Mode', 'Friends Mode'];
    for (const mode of modes) {
      await expect(page.locator(`text=${mode}`)).toBeVisible();
    }
  });

  test('should navigate to module detail', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=Modules');
    await page.click('text=Group Discussion');
    
    await expect(page).toHaveURL(/.*modules/);
  });
});
