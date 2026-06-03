import { test, expect } from '@playwright/test'
import { loginAsAdmin, DEMO_EMAIL, DEMO_PASSWORD } from './helpers/auth'

test.describe('Autenticación', () => {
  test('Login con credenciales correctas redirige al dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', DEMO_EMAIL)
    await page.fill('input[type="password"]', DEMO_PASSWORD)
    await page.click('button[type="submit"]')

    await page.waitForURL('**/dashboard')

    await expect(page).toHaveURL(/dashboard/)
    // Tenant name appears in sidebar
    await expect(page.getByText(/Cl[ií]nica San Rafael/i).first()).toBeVisible()

    await page.screenshot({ path: 'test-results/login-success.png', fullPage: true })
  })

  test('Login con credenciales incorrectas muestra error en español', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', DEMO_EMAIL)
    await page.fill('input[type="password"]', 'WrongPass123!')
    await page.click('button[type="submit"]')

    // Error message must be in Spanish
    const errorLocator = page.locator('text=/incorrectos|Correo|contraseña/i')
    await expect(errorLocator.first()).toBeVisible({ timeout: 8000 })

    // Must stay on /login — no redirect on failure
    await expect(page).toHaveURL(/\/login/)

    await page.screenshot({ path: 'test-results/login-error.png', fullPage: true })
  })

  test('Logout limpia la sesión y redirige al login', async ({ page }) => {
    await loginAsAdmin(page)

    // Find and click logout button
    const logoutBtn = page.locator('button', { hasText: /Cerrar sesi[oó]n/i })
    await logoutBtn.click()

    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })

    // Attempt to access protected route — must redirect back to login
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })
})
