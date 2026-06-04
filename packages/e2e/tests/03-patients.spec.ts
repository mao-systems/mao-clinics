import { test, expect } from '@playwright/test'

test.describe('Módulo Pacientes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patients')
    await page.waitForLoadState('networkidle')
  })

  test('Tabla muestra pacientes cargados desde el seed', async ({ page }) => {
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)

    await page.screenshot({ path: 'test-results/patients-table.png', fullPage: true })
  })

  test('DNI se muestra sin puntos (formato 8 dígitos)', async ({ page }) => {
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    // DNI is rendered in a <p class="text-xs text-gray-400"> inside the patient_info cell
    // formatDNI() returns the raw 8-digit string with no dots
    const dniElements = page.locator('tbody tr:first-child p.text-xs')
    const count = await dniElements.count()

    let dniText = ''
    for (let i = 0; i < count; i++) {
      const text = (await dniElements.nth(i).innerText()).trim()
      if (/^\d{8}$/.test(text)) {
        dniText = text
        break
      }
    }

    expect(dniText).toMatch(/^\d{8}$/)

    await page.screenshot({ path: 'test-results/patients-dni-nodots.png', fullPage: true })
  })

  test('Búsqueda por nombre filtra correctamente', async ({ page }) => {
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    const totalBefore = await rows.count()

    const searchInput = page.locator(
      'input[placeholder*="Buscar"], input[placeholder*="buscar"], input[placeholder*="DNI"], input[type="search"]'
    ).first()
    await expect(searchInput).toBeVisible()

    await searchInput.fill('García')
    await page.waitForTimeout(700)
    await page.waitForLoadState('networkidle')

    const filteredRows = page.locator('tbody tr')
    const filteredCount = await filteredRows.count()
    expect(filteredCount).toBeGreaterThan(0)

    for (let i = 0; i < Math.min(filteredCount, 5); i++) {
      const rowText = await filteredRows.nth(i).innerText()
      expect(rowText.toLowerCase()).toContain('garcía')
    }

    await page.screenshot({ path: 'test-results/patients-search-filtered.png', fullPage: true })

    await searchInput.clear()
    await page.waitForTimeout(700)
    await page.waitForLoadState('networkidle')

    const restoredCount = await rows.count()
    expect(restoredCount).toBeGreaterThanOrEqual(totalBefore)

    await page.screenshot({ path: 'test-results/patients-search-cleared.png', fullPage: true })
  })

  test('Formulario muestra error si fecha de nacimiento o sexo están vacíos', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: /Nuevo paciente|Agregar|Registrar/i }).first()
    await expect(newBtn).toBeVisible()
    await newBtn.click()

    await page.waitForTimeout(400)

    // Fill only the non-required-by-new-rule fields — skip date_of_birth and sex
    await page.fill('input[name="dni"]', '12345678')
    await page.fill('input[name="first_name"]', 'Test')
    await page.fill('input[name="last_name"]', 'Validacion')

    const submitBtn = page.locator('button[type="submit"]').last()
    await submitBtn.click()

    await page.waitForTimeout(300)

    // Modal must still be open — form did not submit
    const modal = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    await expect(modal).toBeVisible()

    // Required-field error messages must appear for date_of_birth and sex
    await expect(page.getByText('Requerido').first()).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'test-results/patient-form-validation.png', fullPage: true })

    // Close the modal before the next test
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Crear paciente nuevo funciona y aparece en tabla', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: /Nuevo paciente|Agregar|Registrar/i }).first()
    await expect(newBtn).toBeVisible()
    await newBtn.click()

    await page.waitForTimeout(400)

    // Generate a unique DNI to avoid 409 conflicts on repeated test runs
    // DNI must be exactly 8 digits starting with a non-zero digit
    const uniqueDni = `1${Date.now().toString().slice(-7)}`

    // PatientForm uses react-hook-form register(), so inputs have name= attributes
    // date_of_birth and sex are required fields
    await page.fill('input[name="dni"]', uniqueDni)
    await page.fill('input[name="first_name"]', 'Test')
    await page.fill('input[name="last_name"]', 'E2E Playwright')
    await page.fill('input[name="date_of_birth"]', '1990-05-15')
    await page.check('input[type="radio"][value="M"]')
    await page.fill('input[name="phone"]', '912345678')

    const submitBtn = page.locator('button[type="submit"]').last()
    await submitBtn.click()

    // Wait for the modal to close (success) or for any toast message (success or conflict)
    // The form modal disappears on successful create
    await page.waitForTimeout(2000)
    await page.waitForLoadState('networkidle')

    // Search for the new patient by last name so we find them regardless of pagination order
    const searchInput = page.locator(
      'input[placeholder*="Buscar"], input[placeholder*="buscar"], input[placeholder*="DNI"], input[type="search"]'
    ).first()
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('E2E Playwright')
      await page.waitForTimeout(800)
      await page.waitForLoadState('networkidle')
    }

    // After success the new patient appears in the (filtered) table
    // Use .first() to avoid strict-mode violation when multiple rows match after repeated runs
    await expect(page.getByText('E2E Playwright').first()).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/patient-created.png', fullPage: true })
  })
})
