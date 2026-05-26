import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for cc-gateway WebUI end-to-end tests.
 *
 * Prerequisites:
 *   - The cc-gateway daemon must be running on http://127.0.0.1:17534
 *   - The WebUI is served by the Rust backend (static files + API)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:17534',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
