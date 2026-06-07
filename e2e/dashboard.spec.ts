import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should load the dashboard', async ({ page }) => {
    await page.goto('/');
    // Check for some main dashboard element. 
    // Since I don't know the exact content yet, I'll look for common things like "Dashboard" or "Life OS"
    await expect(page).toHaveTitle(/Life OS/);
  });
});
