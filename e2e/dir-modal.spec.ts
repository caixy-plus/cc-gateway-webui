import { test, expect } from './fixtures';
import { SELECTORS } from './helpers';

test.describe('Directory browser modal', () => {
  test('open modal and select a directory', async ({ page, sessionId }) => {
    await page.goto('/');
    const item = page.locator(`[data-session-id="${sessionId}"]`);
    await item.click();

    // Click "Change Dir" button (enabled only when inactive)
    const changeDirBtn = page.locator('button', { hasText: 'Change Dir' });
    await expect(changeDirBtn).toBeEnabled();
    await changeDirBtn.click();

    // Verify modal opens
    const modal = page.locator(SELECTORS.dirModal);
    await expect(modal).toBeVisible();

    // Click the first directory entry (ends with /)
    const dirEntry = modal.locator('.dir-item').filter({ hasText: /\/$/ }).first();
    await dirEntry.click();

    // Click "Select Directory" to confirm
    await modal.locator('button', { hasText: 'Select Directory' }).click();
    await expect(modal).toBeHidden();

    // Verify work_dir updated in toolbar
    const toolbar = page.locator('.toolbar .work-dir');
    await expect(toolbar).not.toHaveText('~');
  });
});
