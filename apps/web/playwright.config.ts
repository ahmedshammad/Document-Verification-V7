import { defineConfig, devices } from '@playwright/test';

// Skip tests if browser dependencies are not available
const skipTests = !process.env.CI && process.env.SKIP_BROWSER_TESTS === 'true';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      skip: skipTests,
    },
  ],
});
