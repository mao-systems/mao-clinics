import { Page } from '@playwright/test'

export const DEMO_EMAIL    = 'admin@sanrafael.maosystems.io'
export const DEMO_PASSWORD = 'Demo2026!'

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.fill('input[type="email"]', DEMO_EMAIL)
  await page.fill('input[type="password"]', DEMO_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
  await page.waitForLoadState('networkidle')
}
