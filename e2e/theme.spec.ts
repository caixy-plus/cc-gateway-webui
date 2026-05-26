import { test, expect } from '@playwright/test';
import { SELECTORS } from './helpers';

test.describe('Theme switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector(SELECTORS.themePill);
  });

  test('switch to dark mode', async ({ page }) => {
    const pill = page.locator(SELECTORS.themePill);
    await pill.locator('button', { hasText: 'dark' }).click();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('switch to light mode', async ({ page }) => {
    const pill = page.locator(SELECTORS.themePill);
    await pill.locator('button', { hasText: 'light' }).click();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('switch to auto mode', async ({ page }) => {
    const pill = page.locator(SELECTORS.themePill);
    await pill.locator('button', { hasText: 'auto' }).click();
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    expect(theme === 'light' || theme === 'dark').toBe(true);
  });
});
