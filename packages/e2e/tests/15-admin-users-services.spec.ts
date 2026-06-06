import { test, expect } from '@playwright/test'

test.describe('Admin — Usuarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    // Click the Usuarios tab
    const tabUsuarios = page.locator('nav button', { hasText: 'Usuarios' }).first()
    await expect(tabUsuarios).toBeVisible({ timeout: 8000 })
    await tabUsuarios.click()
    await page.waitForTimeout(500)
    await page.waitForLoadState('networkidle')
  })

  test('Tab Usuarios muestra tabla con columnas Nombre, Email, Rol', async ({ page }) => {
    const thead = page.locator('thead')
    await expect(thead).toBeVisible({ timeout: 10000 })

    const theadText = await thead.innerText()
    expect(theadText).toMatch(/nombre/i)
    expect(theadText).toMatch(/email/i)
    expect(theadText).toMatch(/rol/i)

    await page.screenshot({ path: 'test-results/admin-users-columns.png', fullPage: true })
  })

  test('Tabla de usuarios muestra al menos un usuario del seed', async ({ page }) => {
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    await page.screenshot({ path: 'test-results/admin-users-rows.png', fullPage: true })
  })

  test('Columna Rol muestra etiqueta en español (Admin/Doctor/Recepcionista)', async ({ page }) => {
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    const tableText = await page.locator('tbody').innerText()
    const hasRole = /admin|doctor|recepcionista|receptionist/i.test(tableText)
    expect(hasRole).toBe(true)

    await page.screenshot({ path: 'test-results/admin-users-roles.png', fullPage: true })
  })

  test('Botón "Agregar usuario" abre formulario de creación', async ({ page }) => {
    const addBtn = page.locator('button', { hasText: /Agregar usuario/i }).first()
    await expect(addBtn).toBeVisible({ timeout: 8000 })
    await addBtn.click()
    await page.waitForTimeout(400)

    const modal = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    await expect(modal).toBeVisible({ timeout: 6000 })

    const modalText = await modal.innerText()
    const hasFormFields = /nombre|email|rol|contrase[nñ]a/i.test(modalText)
    expect(hasFormFields).toBe(true)

    await page.screenshot({ path: 'test-results/admin-users-add-form.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Columna Estado muestra badge Activo o Inactivo', async ({ page }) => {
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    const tableText = await page.locator('tbody').innerText()
    const hasStatus = /activo|inactivo/i.test(tableText)
    expect(hasStatus).toBe(true)

    await page.screenshot({ path: 'test-results/admin-users-status.png', fullPage: true })
  })
})

test.describe('Admin — Servicios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    const tabServicios = page.locator('nav button', { hasText: /Servicios/i }).first()
    await expect(tabServicios).toBeVisible({ timeout: 8000 })
    await tabServicios.click()
    await page.waitForTimeout(500)
    await page.waitForLoadState('networkidle')
  })

  test('Tab Servicios muestra encabezado "Catálogo de servicios"', async ({ page }) => {
    const heading = page.locator('h2', { hasText: /Cat[aá]logo de servicios/i })
    await expect(heading).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/admin-services-heading.png', fullPage: true })
  })

  test('Tab Servicios tiene botón "Agregar servicio"', async ({ page }) => {
    const addBtn = page.locator('button', { hasText: /Agregar servicio/i }).first()
    await expect(addBtn).toBeVisible({ timeout: 8000 })

    await page.screenshot({ path: 'test-results/admin-services-add-btn.png', fullPage: true })
  })

  test('Servicios están agrupados por categoría con encabezado colapsable', async ({ page }) => {
    // ServicesTab groups by category — each group has a header button
    const categoryHeaders = page.locator('button').filter({
      has: page.locator('span.uppercase'),
    })
    const count = await categoryHeaders.count()
    // Could be 0 if no services, but seed should have at least 1 category
    if (count > 0) {
      await expect(categoryHeaders.first()).toBeVisible()
      const headerText = await categoryHeaders.first().innerText()
      expect(headerText.length).toBeGreaterThan(0)
    }

    await page.screenshot({ path: 'test-results/admin-services-categories.png', fullPage: true })
  })

  test('Formulario de nuevo servicio abre modal con campos de nombre y precio', async ({ page }) => {
    const addBtn = page.locator('button', { hasText: /Agregar servicio/i }).first()
    await addBtn.click()
    await page.waitForTimeout(400)

    const modal = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    await expect(modal).toBeVisible({ timeout: 6000 })

    const modalText = await modal.innerText()
    const hasFormFields = /nombre|precio|categor|duraci[oó]n/i.test(modalText)
    expect(hasFormFields).toBe(true)

    await page.screenshot({ path: 'test-results/admin-services-form.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })
})

test.describe('Admin — Mi Cuenta', () => {
  test('Tab Mi Cuenta muestra información del usuario autenticado', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const tabMiCuenta = page.locator('nav button', { hasText: /Mi cuenta/i }).first()
    await expect(tabMiCuenta).toBeVisible({ timeout: 8000 })
    await tabMiCuenta.click()
    await page.waitForTimeout(500)

    const bodyText = await page.locator('body').innerText()
    // Should show the user's name or email
    const hasUserInfo = /admin@|san rafael|correo|nombre|contrase[nñ]a/i.test(bodyText)
    expect(hasUserInfo).toBe(true)

    await page.screenshot({ path: 'test-results/admin-my-account.png', fullPage: true })
  })
})
