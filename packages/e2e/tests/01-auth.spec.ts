import { test, expect } from '@playwright/test'
import { loginAsAdmin, DEMO_EMAIL, DEMO_PASSWORD } from './helpers/auth'

// This file tests the login page itself — must start with NO session.
// Override the global storageState so the app doesn't auto-redirect to /dashboard.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Autenticación', () => {
  test('Login con credenciales correctas redirige al dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', DEMO_EMAIL)
    await page.fill('input[type="password"]', DEMO_PASSWORD)
    await page.click('button[type="submit"]')

    await page.waitForURL('**/dashboard', { timeout: 15000 })

    await expect(page).toHaveURL(/dashboard/)
    await expect(page.getByText(/Cl[ií]nica San Rafael/i).first()).toBeVisible()

    await page.screenshot({ path: 'test-results/login-success.png', fullPage: true })
  })

  test('Login con credenciales incorrectas muestra error en español', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', DEMO_EMAIL)
    await page.fill('input[type="password"]', 'WrongPass123!')
    await page.click('button[type="submit"]')

    const errorLocator = page.locator('text=/incorrectos|Correo|contraseña/i')
    await expect(errorLocator.first()).toBeVisible({ timeout: 8000 })
    await expect(page).toHaveURL(/\/login/)

    await page.screenshot({ path: 'test-results/login-error.png', fullPage: true })
  })

  test('Logout limpia la sesión y redirige al login', async ({ page }) => {
    // This test needs to log in first (storageState is empty for this file)
    await loginAsAdmin(page)

    const logoutBtn = page.locator('button', { hasText: /Cerrar sesi[oó]n/i })
    await logoutBtn.click()

    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})
