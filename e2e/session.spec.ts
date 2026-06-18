import { test, expect } from './fixtures';
import { SELECTORS, deleteAllSessions } from './helpers';

test.describe('Session CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector(SELECTORS.newSessionBtn);
    // Ensure clean slate
    const items = page.locator(SELECTORS.sessionItem);
    if ((await items.count()) > 0) {
      await deleteAllSessions(page);
    }
  });

  test.afterEach(async ({ page }) => {
    const items = page.locator(SELECTORS.sessionItem);
    if ((await items.count()) > 0) {
      await deleteAllSessions(page);
    }
  });

  test('create, activate and delete a session', async ({ page }) => {
    // Create session
    await page.locator(SELECTORS.newSessionBtn).click();
    const items = page.locator(SELECTORS.sessionItem);
    await expect(items).toHaveCount(1);

    const firstItem = items.first();
    await expect(firstItem).not.toBeEmpty();

    // Activate session by clicking
    await firstItem.click();
    await expect(firstItem).toHaveClass(/active/);

    // Delete session
    page.once('dialog', (dialog) => dialog.accept());
    await firstItem.locator('.delete-btn').click();
    await expect(items).toHaveCount(0);
  });

  test('create multiple sessions and switch between them', async ({ page }) => {
    await page.locator(SELECTORS.newSessionBtn).click();
    await page.locator(SELECTORS.newSessionBtn).click();

    const items = page.locator(SELECTORS.sessionItem);
    await expect(items).toHaveCount(2);

    const second = items.nth(1);
    await second.click();
    await expect(second).toHaveClass(/active/);
  });
});
