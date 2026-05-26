import { test, expect } from './fixtures';
import { SELECTORS } from './helpers';

test.describe('Chat flow', () => {
  test('type and send a message', async ({ page, sessionId }) => {
    await page.goto('/');
    // Activate the fixture-created session and start it
    const item = page.locator(`[data-session-id="${sessionId}"]`);
    await item.click();
    await expect(item).toHaveClass(/active/);

    // Start the session so input becomes available
    await page.locator('.empty-state button', { hasText: 'Start Session' }).click();
    await expect(page.locator(SELECTORS.messageInput)).toBeVisible();

    const input = page.locator(SELECTORS.messageInput);
    const sendBtn = page.locator(SELECTORS.sendBtn);

    await input.fill('Hello from Playwright');
    await sendBtn.click();

    // Verify message appears in chat
    await expect(page.locator('.message.user')).toContainText('Hello from Playwright');
  });

  test('typing indicator appears while sending', async ({ page, sessionId }) => {
    await page.goto('/');
    const item = page.locator(`[data-session-id="${sessionId}"]`);
    await item.click();

    // Start the session so input becomes available
    await page.locator('.empty-state button', { hasText: 'Start Session' }).click();
    await expect(page.locator(SELECTORS.messageInput)).toBeVisible();

    const input = page.locator(SELECTORS.messageInput);
    await input.fill('Trigger typing indicator');

    // Click send and immediately check for indicator
    await page.locator(SELECTORS.sendBtn).click();
    await expect(page.locator(SELECTORS.typingIndicator)).toBeVisible();
  });
});
