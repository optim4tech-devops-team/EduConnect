import { defineConfig } from '@playwright/test';

const baseURL = process.env.QA_MOBILE_WEB_URL || 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'reports/playwright-html' }],
    ['junit', { outputFile: 'reports/playwright-junit.xml' }],
  ],
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
