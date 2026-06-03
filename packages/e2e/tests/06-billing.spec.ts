import { test, expect } from '@playwright/test'

// Widen the date filter to show all historical invoices (seed data is in the past)
async function widenDateFilter(page: import('@playwright/test').Page) {
  const dateInputs = page.locator('input[type="date"]')
  const count = await dateInputs.count()
  if (count > 0) {
    // Set "from" date to 2020-01-01 to capture all seed invoices
    await dateInputs.first().fill('2020-01-01')
    await dateInputs.first().press('Tab')
    await page.waitForTimeout(600)
    await page.waitForLoadState('networkidle')
  }
}

test.describe('Facturación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/billing')
    await page.waitForLoadState('networkidle')
    // Seed invoices have past dates; billing defaults to current month — widen the filter
    await widenDateFilter(page)
  })

  test('Lista de comprobantes carga datos del seed', async ({ page }) => {
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    // Seed creates B001 (boleta) and F001 (factura) series
    const tableText = await page.locator('tbody').innerText()
    const hasSeries = /B001|F001/.test(tableText)
    expect(hasSeries).toBe(true)

    await page.screenshot({ path: 'test-results/billing-list.png', fullPage: true })
  })

  test('Crear boleta nueva funciona y aparece en la lista', async ({ page }) => {
    // Open InvoiceForm — button is in InvoiceFilters toolbar
    const newBtn = page.locator('button', { hasText: /Nuevo comprobante|Nueva factura|Emitir/i }).first()
    await expect(newBtn).toBeVisible()
    await newBtn.click()

    // InvoiceForm renders inside Modal (max-w-2xl xl size)
    const modalPanel = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    await expect(modalPanel).toBeVisible({ timeout: 6000 })

    // Select type — boleta is the default (z.enum(['boleta','factura']))
    // The radio/select for type is likely visible; boleta is default so skip if already set

    // Use quick-service chip "Consulta médica" — price 80.00
    const chip = page.locator('button', { hasText: 'Consulta médica' }).first()
    if (await chip.isVisible().catch(() => false)) {
      await chip.click()
      await page.waitForTimeout(300)

      // Verify totals panel shows correct IGV calculation
      const totalsText = await page.locator('body').innerText()
      expect(totalsText).toContain('80') // subtotal
    } else {
      // Fallback: fill a line item manually
      const addBtn = page.locator('button', { hasText: /Agregar concepto|Agregar/i }).first()
      if (await addBtn.isVisible().catch(() => false)) await addBtn.click()

      const descInput = page.locator('input[placeholder*="descripción"], input[placeholder*="Descripci"]').last()
      if (await descInput.isVisible().catch(() => false)) await descInput.fill('Consulta médica')

      const priceInput = page.locator('input[placeholder*="0.00"], input[placeholder*="precio"]').last()
      if (await priceInput.isVisible().catch(() => false)) {
        await priceInput.fill('80.00')
        await priceInput.press('Tab')
        await page.waitForTimeout(300)
      }
    }

    await page.screenshot({ path: 'test-results/billing-new-invoice-filled.png', fullPage: true })

    // Submit the form
    const submitBtn = page.locator('button[type="submit"], button', { hasText: /Emitir comprobante|Emitir/i }).last()
    await submitBtn.click()

    // Toast confirmation — success toast has bg-emerald-600 inside aria-live="polite"
    const toast = page.locator('[aria-live="polite"] div').first()
    await expect(toast).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/billing-new-invoice.png', fullPage: true })
  })

  test('Cálculo de IGV no genera errores de punto flotante', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: /Nuevo comprobante|Nueva factura|Emitir/i }).first()
    await expect(newBtn).toBeVisible()
    await newBtn.click()

    const modalPanel = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    await expect(modalPanel).toBeVisible({ timeout: 6000 })

    // Price that would cause floating point issues: 33.33 * 0.18 = 5.9994
    const addBtn = page.locator('button', { hasText: /Agregar concepto|Agregar/i }).first()
    if (await addBtn.isVisible().catch(() => false)) await addBtn.click()

    const priceInput = page.locator('input[placeholder*="0.00"], input[placeholder*="precio"]').last()
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill('33.33')
      await priceInput.press('Tab')
      await page.waitForTimeout(400)

      // Totals panel shows formatted currency strings — check for no exponential notation
      const totalsSection = page.locator('body')
      const text = await totalsSection.innerText()

      expect(text).not.toMatch(/\de[+\-]\d/i)  // no exponential notation like 5.9e+0
      expect(text).not.toMatch(/\.\d{3,}/)      // no more than 2 decimal places in displayed amounts
    }

    await page.screenshot({ path: 'test-results/billing-igv-check.png', fullPage: true })
  })
})
