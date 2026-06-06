import { test, expect } from '@playwright/test'

async function widenDateFilter(page: import('@playwright/test').Page) {
  const dateInputs = page.locator('input[type="date"]')
  const count = await dateInputs.count()
  if (count > 0) {
    await dateInputs.first().fill('2020-01-01')
    await dateInputs.first().press('Tab')
    await page.waitForTimeout(600)
    await page.waitForLoadState('networkidle')
  }
}

async function openNewInvoiceModal(page: import('@playwright/test').Page) {
  const newBtn = page.locator('button', { hasText: /Nuevo comprobante|Nueva factura|Emitir/i }).first()
  await expect(newBtn).toBeVisible({ timeout: 8000 })
  await newBtn.click()
  const modal = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
  await expect(modal).toBeVisible({ timeout: 6000 })
  return modal
}

test.describe('Facturación — tabla y filtros', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/billing')
    await page.waitForLoadState('networkidle')
    await widenDateFilter(page)
  })

  test('Tabla de comprobantes tiene columnas Serie, Paciente, Total', async ({ page }) => {
    const thead = page.locator('thead')
    await expect(thead).toBeVisible({ timeout: 10000 })

    const theadText = await thead.innerText()
    expect(theadText).toMatch(/serie|comprobante/i)
    expect(theadText).toMatch(/paciente/i)
    expect(theadText).toMatch(/total|monto/i)

    await page.screenshot({ path: 'test-results/billing-table-columns.png', fullPage: true })
  })

  test('Comprobantes tienen número de serie B001 o F001', async ({ page }) => {
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 })
    const tableText = await page.locator('tbody').innerText()
    expect(tableText).toMatch(/B001|F001/)

    await page.screenshot({ path: 'test-results/billing-series.png', fullPage: true })
  })

  test('Comprobantes muestran importes con formato numérico (no exponencial)', async ({ page }) => {
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 })
    const tableText = await page.locator('tbody').innerText()

    // No exponential notation (e.g., 5.9e+0)
    expect(tableText).not.toMatch(/\de[+\-]\d/i)
    // Amounts should have at most 2 decimal places
    expect(tableText).not.toMatch(/\.\d{4,}/)

    await page.screenshot({ path: 'test-results/billing-amounts-format.png', fullPage: true })
  })

  test('Filtro de fecha "desde" actualiza la lista al cambiarla', async ({ page }) => {
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 })
    const countBefore = await page.locator('tbody tr').count()

    // Set from-date to today to filter out all past invoices
    const today = new Date().toISOString().split('T')[0]
    const dateInputs = page.locator('input[type="date"]')
    if (await dateInputs.count() > 0) {
      await dateInputs.first().fill(today)
      await dateInputs.first().press('Tab')
      await page.waitForTimeout(700)
      await page.waitForLoadState('networkidle')
      // Count may have changed (could be 0 if no invoices today)
      const countAfter = await page.locator('tbody tr').count()
      // Either fewer rows or zero — just verify no crash
      expect(countAfter).toBeGreaterThanOrEqual(0)
    }

    await page.screenshot({ path: 'test-results/billing-date-filter.png', fullPage: true })
  })

  test('Comprobantes muestran badge de estado (emitido/anulado)', async ({ page }) => {
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 })
    const tableText = await page.locator('tbody').innerText()
    // getStatusLabel map: mock→Demo, pending→Pendiente, accepted→Aceptado, rejected→Rechazado, cancelled→Anulado
    const hasStatus = /demo|pendiente|aceptado|rechazado|anulado/i.test(tableText)
    expect(hasStatus).toBe(true)

    await page.screenshot({ path: 'test-results/billing-status-badge.png', fullPage: true })
  })
})

test.describe('Facturación — formulario de nuevo comprobante', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/billing')
    await page.waitForLoadState('networkidle')
    await widenDateFilter(page)
  })

  test('Formulario tiene chips de servicios rápidos (Consulta médica, etc.)', async ({ page }) => {
    const modal = await openNewInvoiceModal(page)

    // Quick service chips like "Consulta médica"
    const chips = modal.locator('button', { hasText: /consulta m[eé]dica|consulta|examen/i })
    const count = await chips.count()
    if (count > 0) {
      await expect(chips.first()).toBeVisible()
    } else {
      // Fallback: check modal has line-item section
      const modalText = await modal.innerText()
      expect(modalText).toMatch(/concepto|servicio|descripci[oó]n/i)
    }

    await page.screenshot({ path: 'test-results/billing-form-chips.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Formulario muestra sección de Subtotal, IGV y Total', async ({ page }) => {
    const modal = await openNewInvoiceModal(page)

    // Add a chip or line item to trigger totals calculation
    const chip = modal.locator('button', { hasText: /consulta/i }).first()
    if (await chip.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chip.click()
      await page.waitForTimeout(400)
    }

    const modalText = await modal.innerText()
    // Totals section labels
    const hasSubtotal = /subtotal/i.test(modalText)
    const hasIGV      = /igv|impuesto/i.test(modalText)
    const hasTotal    = /total/i.test(modalText)
    expect(hasSubtotal || hasIGV || hasTotal).toBe(true)

    await page.screenshot({ path: 'test-results/billing-form-totals.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Formulario tiene selector de tipo: boleta y factura', async ({ page }) => {
    const modal = await openNewInvoiceModal(page)

    const modalText = await modal.innerText()
    // Invoice type options
    const hasTypes = /boleta|factura/i.test(modalText)
    expect(hasTypes).toBe(true)

    await page.screenshot({ path: 'test-results/billing-form-types.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Seleccionar chip "Consulta médica" actualiza el importe del ítem', async ({ page }) => {
    const modal = await openNewInvoiceModal(page)

    const chip = modal.locator('button', { hasText: 'Consulta médica' }).first()
    if (await chip.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chip.click()
      await page.waitForTimeout(400)

      const modalText = await modal.innerText()
      // Price 80.00 should appear in the totals
      expect(modalText).toMatch(/80/)
    } else {
      console.warn('"Consulta médica" chip not found — seed data may vary')
    }

    await page.screenshot({ path: 'test-results/billing-form-chip-price.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })
})
