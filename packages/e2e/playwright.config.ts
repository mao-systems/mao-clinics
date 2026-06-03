import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.TEST_URL || 'https://demo.maosystems.io',
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'on',
    video: 'on-first-retry',
    trace: 'on-first-retry',
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  projects: [
    { name: 'chromium', use: { channel: 'chromium' } },
  ],
})
