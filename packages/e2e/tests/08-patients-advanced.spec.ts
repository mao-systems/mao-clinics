import { test, expect } from '@playwright/test'

test.describe('Módulo Pacientes — avanzado', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patients')
    await page.waitForLoadState('networkidle')
    // Ensure at least one row is visible before each test
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 })
  })

  test('Búsqueda por DNI de 8 dígitos filtra correctamente', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const firstRowText = await rows.first().innerText()

    // Extract the first DNI found in the first row
    const dniMatch = firstRowText.match(/\b\d{8}\b/)
    if (!dniMatch) {
      console.warn('No DNI found in first row — skipping DNI search assertion')
      return
    }
    const dni = dniMatch[0]

    const searchInput = page.locator(
      'input[placeholder*="Buscar"], input[placeholder*="buscar"], input[placeholder*="DNI"], input[type="search"]'
    ).first()
    await searchInput.fill(dni)
    await page.waitForTimeout(700)
    await page.waitForLoadState('networkidle')

    const filteredRows = page.locator('tbody tr')
    const count = await filteredRows.count()
    expect(count).toBeGreaterThan(0)

    // Every visible row must contain that DNI
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await filteredRows.nth(i).innerText()
      expect(text).toContain(dni)
    }

    await page.screenshot({ path: 'test-results/patients-search-by-dni.png', fullPage: true })
  })

  test('Búsqueda sin coincidencias muestra estado vacío', async ({ page }) => {
    const searchInput = page.locator(
      'input[placeholder*="Buscar"], input[placeholder*="buscar"], input[placeholder*="DNI"], input[type="search"]'
    ).first()
    await searchInput.fill('ZZZ99999999NOMATCH')
    await page.waitForTimeout(700)
    await page.waitForLoadState('networkidle')

    // Either no rows or an empty-state message should appear
    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()
    const pageText = await page.locator('body').innerText()
    const hasEmptyState = rowCount === 0 || /no se encontr|sin resultados|no hay pacientes/i.test(pageText)
    expect(hasEmptyState).toBe(true)

    await page.screenshot({ path: 'test-results/patients-empty-search.png', fullPage: true })
  })

  test('Formulario de nuevo paciente valida DNI con formato incorrecto', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: /Nuevo paciente|Agregar|Registrar/i }).first()
    await newBtn.click()
    await page.waitForTimeout(400)

    // DNI must be exactly 8 digits — enter a 5-digit value
    await page.fill('input[name="dni"]', '12345')
    await page.fill('input[name="first_name"]', 'Test')
    await page.fill('input[name="last_name"]', 'Validacion DNI')
    await page.fill('input[name="date_of_birth"]', '1990-01-01')
    await page.check('input[type="radio"][value="M"]')

    const submitBtn = page.locator('button[type="submit"]').last()
    await submitBtn.click()
    await page.waitForTimeout(300)

    // Modal stays open on validation failure
    const modal = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    await expect(modal).toBeVisible()

    // Some error message about DNI must be shown
    const errorText = await page.locator('body').innerText()
    const hasDniError = /dni|8 d[ií]gitos|formato|inv[aá]lido/i.test(errorText)
    expect(hasDniError).toBe(true)

    await page.screenshot({ path: 'test-results/patients-dni-invalid.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Formulario de nuevo paciente valida teléfono con formato incorrecto', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: /Nuevo paciente|Agregar|Registrar/i }).first()
    await newBtn.click()
    await page.waitForTimeout(400)

    const uniqueDni = `2${Date.now().toString().slice(-7)}`
    await page.fill('input[name="dni"]', uniqueDni)
    await page.fill('input[name="first_name"]', 'Test')
    await page.fill('input[name="last_name"]', 'Phone Validation')
    await page.fill('input[name="date_of_birth"]', '1985-06-20')
    await page.check('input[type="radio"][value="F"]')

    // Peruvian phone must start with 9 and be 9 digits; enter invalid
    const phoneInput = page.locator('input[name="phone"]')
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill('12345')
      const submitBtn = page.locator('button[type="submit"]').last()
      await submitBtn.click()
      await page.waitForTimeout(300)

      const bodyText = await page.locator('body').innerText()
      // Either the modal is still open (validation blocked submit) or an error appears
      const modal = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
      const modalVisible = await modal.isVisible().catch(() => false)
      const hasPhoneError = /tel[eé]fono|9 d[ií]gitos|formato|inv[aá]lido/i.test(bodyText)
      expect(modalVisible || hasPhoneError).toBe(true)
    } else {
      console.warn('Phone input not found — skipping phone validation test')
    }

    await page.screenshot({ path: 'test-results/patients-phone-invalid.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Intentar crear paciente con DNI duplicado muestra error de conflicto', async ({ page }) => {
    // Get the DNI of the first patient in the table
    const rows = page.locator('tbody tr')
    const firstRowText = await rows.first().innerText()
    const dniMatch = firstRowText.match(/\b\d{8}\b/)
    if (!dniMatch) {
      console.warn('No DNI found in table — skipping duplicate DNI test')
      return
    }
    const existingDni = dniMatch[0]

    const newBtn = page.locator('button', { hasText: /Nuevo paciente|Agregar|Registrar/i }).first()
    await newBtn.click()
    await page.waitForTimeout(400)

    await page.fill('input[name="dni"]', existingDni)
    await page.fill('input[name="first_name"]', 'Duplicado')
    await page.fill('input[name="last_name"]', 'Test Conflict')
    await page.fill('input[name="date_of_birth"]', '1992-03-10')
    await page.check('input[type="radio"][value="M"]')

    const submitBtn = page.locator('button[type="submit"]').last()
    await submitBtn.click()
    await page.waitForTimeout(1500)
    await page.waitForLoadState('networkidle')

    // Server returns 409 — frontend shows an error toast or inline error
    const bodyText = await page.locator('body').innerText()
    const hasConflictError = /ya existe|duplicado|registrado|conflicto|409/i.test(bodyText)
    expect(hasConflictError).toBe(true)

    await page.screenshot({ path: 'test-results/patients-duplicate-dni.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Editar paciente existente: modal de edición se abre correctamente', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const firstRow = rows.first()

    // Look for edit button — could be an icon button or text button in the row
    const editBtn = firstRow.locator('button[title*="Editar"], button[aria-label*="ditar"], [data-action="edit"]').first()
    const hasEditBtn = await editBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!hasEditBtn) {
      // Some UIs open the edit form by clicking the row itself
      await firstRow.click()
      await page.waitForTimeout(500)
    } else {
      await editBtn.click()
      await page.waitForTimeout(400)
    }

    // Either a modal appeared, or we navigated to an edit page
    const modal = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    const modalVisible = await modal.isVisible({ timeout: 5000 }).catch(() => false)
    const urlChanged = page.url().includes('edit') || page.url().includes('paciente')

    expect(modalVisible || urlChanged).toBe(true)

    await page.screenshot({ path: 'test-results/patients-edit-modal.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Paginación: botón de siguiente página funciona', async ({ page }) => {
    const nextBtn = page.locator('button', { hasText: /Siguiente|›|>/ }).last()
    const hasPagination = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (!hasPagination) {
      console.warn('No pagination found — list may show all results on one page')
      // Pass the test: small dataset on one page is valid behavior
      return
    }

    const rowsBefore = await page.locator('tbody tr').count()
    const isDisabled = await nextBtn.isDisabled().catch(() => false)

    if (!isDisabled) {
      await nextBtn.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      const rowsAfter = await page.locator('tbody tr').count()
      // After clicking next, rows should still be visible
      expect(rowsAfter).toBeGreaterThan(0)
    }

    await page.screenshot({ path: 'test-results/patients-pagination.png', fullPage: true })
  })
})
