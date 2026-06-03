import { test, expect } from '@playwright/test'

test.describe('Módulo Pacientes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patients')
    await page.waitForLoadState('networkidle')
  })

  test('Tabla muestra pacientes cargados desde el seed', async ({ page }) => {
    // Table rows — tbody tr elements
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)

    await page.screenshot({ path: 'test-results/patients-table.png', fullPage: true })
  })

  test('DNI se muestra sin puntos (formato 8 dígitos)', async ({ page }) => {
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    // Find the first cell that looks like a DNI (8 consecutive digits)
    const cells = page.locator('tbody tr:first-child td')
    const cellCount = await cells.count()

    let dniText = ''
    for (let i = 0; i < cellCount; i++) {
      const text = (await cells.nth(i).innerText()).trim()
      if (/^\d{8}$/.test(text)) {
        dniText = text
        break
      }
    }

    // DNI must be exactly 8 digits with no dots or separators
    expect(dniText).toMatch(/^\d{8}$/)

    await page.screenshot({ path: 'test-results/patients-dni-nodots.png', fullPage: true })
  })

  test('Búsqueda por nombre filtra correctamente', async ({ page }) => {
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    const totalBefore = await rows.count()

    // Locate the search input — could have placeholder mentioning "Buscar" or "DNI"
    const searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="buscar"], input[placeholder*="DNI"], input[type="search"]').first()
    await expect(searchInput).toBeVisible()

    await searchInput.fill('García')
    // Wait for debounce (typically 300–500ms in this codebase)
    await page.waitForTimeout(700)
    await page.waitForLoadState('networkidle')

    // All visible rows should contain García
    const filteredRows = page.locator('tbody tr')
    const filteredCount = await filteredRows.count()
    expect(filteredCount).toBeGreaterThan(0)

    // Each visible row must contain the searched name
    for (let i = 0; i < Math.min(filteredCount, 5); i++) {
      const rowText = await filteredRows.nth(i).innerText()
      expect(rowText.toLowerCase()).toContain('garcía')
    }

    await page.screenshot({ path: 'test-results/patients-search-filtered.png', fullPage: true })

    // Clear search — more rows should come back
    await searchInput.clear()
    await page.waitForTimeout(700)
    await page.waitForLoadState('networkidle')

    const restoredCount = await rows.count()
    expect(restoredCount).toBeGreaterThanOrEqual(totalBefore)

    await page.screenshot({ path: 'test-results/patients-search-cleared.png', fullPage: true })
  })

  test('Crear paciente nuevo funciona y aparece en tabla', async ({ page }) => {
    // Click new patient button
    const newBtn = page.locator('button', { hasText: /Nuevo paciente|Agregar paciente|Nuevo/i }).first()
    await expect(newBtn).toBeVisible()
    await newBtn.click()

    // Wait for modal/form to appear
    await page.waitForTimeout(500)

    // Fill required fields
    await page.fill('input[name="dni"], input[placeholder*="DNI"], input[placeholder*="12345678"]', '99887766')
    await page.fill('input[name="first_name"], input[name="firstName"], input[placeholder*="Nombres"]', 'Test')
    await page.fill('input[name="last_name"], input[name="lastName"], input[placeholder*="Apellidos"]', 'E2E Playwright')
    await page.fill('input[name="phone"], input[placeholder*="9"]', '912345678')

    // Submit the form
    const submitBtn = page.locator('button[type="submit"], button', { hasText: /Guardar|Crear|Registrar/i }).last()
    await submitBtn.click()

    // Toast / success notification should appear
    const toast = page.locator('[class*="toast"], [class*="Toast"], [role="alert"], [class*="notification"]')
    await expect(toast.first()).toBeVisible({ timeout: 8000 })

    // Patient should appear in the table
    await expect(page.getByText('E2E Playwright')).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/patient-created.png', fullPage: true })
  })
})
