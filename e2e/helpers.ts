import { Page, Locator } from '@playwright/test';

export const SELECTORS = {
  newSessionBtn: '[data-testid="new-session-btn"]',
  sessionItem: '[data-testid="session-item"]',
  messageInput: '[data-testid="message-input"]',
  sendBtn: '[data-testid="send-btn"]',
  typingIndicator: '[data-testid="typing-indicator"]',
  themePill: '[data-testid="theme-pill"]',
  dirModal: '[data-testid="dir-modal"]',
  settingsBtn: '[data-testid="settings-btn"]',
} as const;

export async function getSessionItems(page: Page): Promise<Locator> {
  return page.locator(SELECTORS.sessionItem);
}

export async function createSession(page: Page): Promise<void> {
  await page.locator(SELECTORS.newSessionBtn).click();
  await page.waitForSelector(SELECTORS.sessionItem);
}

export async function deleteAllSessions(page: Page): Promise<void> {
  const items = page.locator(SELECTORS.sessionItem);
  const count = await items.count();
  for (let i = count - 1; i >= 0; i--) {
    const item = items.nth(i);
    const deleteBtn = item.locator('.delete-btn');
    page.once('dialog', (dialog) => dialog.accept());
    await deleteBtn.click();
    await item.waitFor({ state: 'detached' });
  }
}
