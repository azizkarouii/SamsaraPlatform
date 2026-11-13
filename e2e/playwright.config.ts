import { defineConfig, devices } from '@playwright/test';

/**
 * The site is served from the production build with /api forwarded to a running backend
 * (BACKEND_PORT, 3099 by default) started with EMAIL_VERIFICATION=false and COOKIE_SECURE=false.
 * Locally the installed Chrome is used; in the CI, the Chromium of Playwright.
 */
const port = Number(process.env.SITE_PORT ?? 4399);
const backendPort = Number(process.env.BACKEND_PORT ?? 3099);

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'fr-FR',
    timezoneId: 'Africa/Tunis', // same as APP_TIMEZONE of the backend (see tests/helpers.ts)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 }, channel: process.env.CI ? undefined : 'chrome' } },
  ],
  webServer: {
    command: `node serve.mjs ../frontend/dist/frontend/browser ${port} ${backendPort}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
