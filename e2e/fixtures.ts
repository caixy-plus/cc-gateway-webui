import { test as base, expect } from '@playwright/test';
import { createSession, deleteAllSessions } from './helpers';

/**
 * Shared test fixture that creates a single session before each test
 * and cleans up all sessions afterwards.
 */
export const test = base.extend<{
  sessionId: string;
}>({
  sessionId: async ({ page }, use) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="new-session-btn"]');

    // Clean any leftover sessions from previous runs
    const items = page.locator('[data-testid="session-item"]');
    if ((await items.count()) > 0) {
      await deleteAllSessions(page);
    }

    await createSession(page);
    const firstItem = page.locator('[data-testid="session-item"]').first();
    const id = await firstItem.getAttribute('data-session-id');
    expect(id).toBeTruthy();
    await use(id!);

    // Cleanup
    await deleteAllSessions(page);
  },
});

export { expect } from '@playwright/test';
