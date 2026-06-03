/**
 * Runs ONCE before the entire test suite.
 * Logs in as admin, saves the browser storage state (cookies) to disk.
 * Every test then loads that state instead of logging in again — this means
 * the login endpoint is hit exactly once per test run, avoiding rate limits.
 */

import { chromium, FullConfig } from '@playwright/test'
import { DEMO_EMAIL, DEMO_PASSWORD } from './helpers/auth'
import path from 'path'

export const AUTH_STATE_PATH = path.join(__dirname, '../.auth/admin.json')

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    baseURL: process.env.TEST_URL || 'https://demo.maosystems.io',
  })
  const page = await context.newPage()

  await page.goto('/login')
  await page.fill('input[type="email"]', DEMO_EMAIL)
  await page.fill('input[type="password"]', DEMO_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
  await page.waitForLoadState('networkidle')

  // Persist cookies + localStorage to disk — reused by every test worker
  await context.storageState({ path: AUTH_STATE_PATH })

  await browser.close()
}
