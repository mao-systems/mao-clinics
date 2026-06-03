import { Page } from '@playwright/test'

export const DEMO_EMAIL    = 'admin@sanrafael.maosystems.io'
export const DEMO_PASSWORD = 'Demo2026!'

/**
 * Full login flow — only call this in 01-auth.spec.ts which must test the
 * login page itself. All other test files rely on the storageState set by
 * global-setup.ts and should NOT call this (would waste a rate-limited slot).
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.fill('input[type="email"]', DEMO_EMAIL)
  await page.fill('input[type="password"]', DEMO_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
  await page.waitForLoadState('networkidle')
}
