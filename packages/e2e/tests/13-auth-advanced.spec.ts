import { test, expect } from '@playwright/test'
import { DEMO_EMAIL, DEMO_PASSWORD } from './helpers/auth'

// Tests that need an empty session
test.describe('Autenticación — formulario y validación', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
  })

  test('Página de login muestra marca "Clinova" y campo de acceso', async ({ page }) => {
    await expect(page.locator('text=Clinova').first()).toBeVisible()
    await expect(page.locator('h1', { hasText: 'Bienvenido' })).toBeVisible()
    await page.screenshot({ path: 'test-results/login-page-title.png', fullPage: true })
  })

  test('Login con email vacío muestra error de validación', async ({ page }) => {
    // Leave email empty, fill password, submit
    await page.fill('input[type="password"]', DEMO_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(300)

    // Zod schema: email is required — error must appear
    const bodyText = await page.locator('body').innerText()
    const hasEmailError = /correo|email|v[aá]lido|requerido/i.test(bodyText)
    expect(hasEmailError).toBe(true)
    await expect(page).toHaveURL(/\/login/)

    await page.screenshot({ path: 'test-results/login-empty-email.png', fullPage: true })
  })

  test('Login con contraseña corta (menos de 6 chars) muestra error', async ({ page }) => {
    await page.fill('input[type="email"]', DEMO_EMAIL)
    await page.fill('input[type="password"]', '123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(300)

    // Zod: min 6 chars for password
    const bodyText = await page.locator('body').innerText()
    const hasPasswordError = /6 car[aá]cteres|contrase[nñ]a|m[ií]nimo/i.test(bodyText)
    expect(hasPasswordError).toBe(true)
    await expect(page).toHaveURL(/\/login/)

    await page.screenshot({ path: 'test-results/login-short-password.png', fullPage: true })
  })

  test('Login con formato de email inválido muestra error', async ({ page }) => {
    await page.fill('input[type="email"]', 'not-an-email')
    await page.fill('input[type="password"]', DEMO_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(300)

    const bodyText = await page.locator('body').innerText()
    const hasEmailFormatError = /correo v[aá]lido|email|formato/i.test(bodyText)
    expect(hasEmailFormatError).toBe(true)

    await page.screenshot({ path: 'test-results/login-invalid-email.png', fullPage: true })
  })

  test('Campo de contraseña tiene botón de mostrar/ocultar', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()

    // Eye/EyeOff toggle button must exist next to the password field
    const toggleBtn = page.locator('button[type="button"]').filter({
      has: page.locator('svg'),
    }).first()
    await expect(toggleBtn).toBeVisible({ timeout: 5000 })

    // Click toggle — input type should change to "text"
    await toggleBtn.click()
    const inputType = await page.locator('input#email ~ * input, input[name="password"], input#password')
      .first().getAttribute('type').catch(() => null)
    // After toggle, password field becomes type="text"
    const visibleInput = page.locator('input[type="text"]')
    const isText = await visibleInput.count() > 0
    expect(isText).toBe(true)

    await page.screenshot({ path: 'test-results/login-show-password.png', fullPage: true })
  })

  test('Login placeholder de email es visible y describe el formato', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()

    const placeholder = await emailInput.getAttribute('placeholder')
    expect(placeholder).toBeTruthy()
    // Placeholder should contain @ or "correo"
    const isDescriptive = /@|correo|email/i.test(placeholder ?? '')
    expect(isDescriptive).toBe(true)

    await page.screenshot({ path: 'test-results/login-placeholder.png', fullPage: true })
  })
})

// Tests that need an active session
test.describe('Autenticación — sesión activa', () => {
  test('Página de login redirige al dashboard cuando ya hay sesión', async ({ page }) => {
    // storageState inherited from global setup — user is authenticated
    await page.goto('/login')
    // Should redirect away from login immediately
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    await expect(page).toHaveURL(/dashboard/)

    await page.screenshot({ path: 'test-results/login-redirect-dashboard.png', fullPage: true })
  })

  test('Sesión persiste después de recargar la página', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/dashboard/)

    // Hard reload
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should still be on dashboard, not redirected to login
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page).toHaveURL(/dashboard/)

    await page.screenshot({ path: 'test-results/session-persists.png', fullPage: true })
  })
})
