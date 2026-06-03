import { defineConfig } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,

  // Log in once before all tests, save session to .auth/admin.json
  globalSetup: './tests/global-setup.ts',

  use: {
    baseURL: process.env.TEST_URL || 'https://demo.maosystems.io',
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'on',
    video: 'on-first-retry',
    trace: 'on-first-retry',
    // Every test starts with the saved session — no login needed
    storageState: path.join(__dirname, '.auth/admin.json'),
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
