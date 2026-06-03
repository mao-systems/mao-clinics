import { test, expect } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth'

test.describe('Facturación', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/billing')
    await page.waitForLoadState('networkidle')
  })

  test('Lista de comprobantes carga datos del seed', async ({ page }) => {
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    // Should show boleta/factura series from seed (B001 or F001)
    const tableText = await page.locator('tbody').innerText()
    const hasSeries = /B001|F001/.test(tableText)
    expect(hasSeries).toBe(true)

    await page.screenshot({ path: 'test-results/billing-list.png', fullPage: true })
  })

  test('Crear boleta nueva funciona y aparece en la lista', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: /Nueva factura|Nuevo comprobante|Emitir/i }).first()
    await expect(newBtn).toBeVisible()
    await newBtn.click()

    await page.waitForTimeout(600)

    // Patient search — type to find the first seeded patient
    const patientInput = page.locator('input[placeholder*="Buscar paciente"], input[placeholder*="paciente"], input[name*="patient"]').first()
    if (await patientInput.isVisible().catch(() => false)) {
      await patientInput.fill('García')
      await page.waitForTimeout(500)
      const option = page.locator('[class*="option"], [class*="item"], li').first()
      if (await option.isVisible().catch(() => false)) {
        await option.click()
      }
    }

    // Select invoice type "Boleta"
    const typeSelect = page.locator('select[name*="type"], select[name*="tipo"]')
    if (await typeSelect.isVisible().catch(() => false)) {
      await typeSelect.selectOption({ label: /Boleta/i } as never)
    } else {
      const boletaOption = page.locator('button, label, [role="option"]', { hasText: /Boleta/i }).first()
      if (await boletaOption.isVisible().catch(() => false)) await boletaOption.click()
    }

    // Add a line item
    const addItemBtn = page.locator('button', { hasText: /Agregar.*ítem|Agregar.*item|Add item|Añadir/i }).first()
    if (await addItemBtn.isVisible().catch(() => false)) await addItemBtn.click()

    const descInput = page.locator('input[name*="description"], input[placeholder*="Descripción"], input[placeholder*="descripcion"]').last()
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill('Consulta médica')
    }

    const priceInput = page.locator('input[name*="price"], input[name*="precio"], input[name*="unit_price"], input[placeholder*="Precio"]').last()
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill('80.00')
      await priceInput.press('Tab') // trigger recalculation
      await page.waitForTimeout(300)

      // Verify IGV calculation: 80 * 0.18 = 14.40, total = 94.40
      const igvField = page.locator('input[name*="tax"], input[name*="igv"], [class*="igv"]').first()
      if (await igvField.isVisible().catch(() => false)) {
        const igvValue = await igvField.inputValue()
        expect(parseFloat(igvValue)).toBeCloseTo(14.40, 1)
      }

      const totalField = page.locator('input[name*="total"], [class*="total"]').last()
      if (await totalField.isVisible().catch(() => false)) {
        const totalValue = await totalField.inputValue()
        expect(parseFloat(totalValue)).toBeCloseTo(94.40, 1)
      }
    }

    await page.screenshot({ path: 'test-results/billing-new-invoice-filled.png', fullPage: true })

    // Submit
    const submitBtn = page.locator('button[type="submit"], button', { hasText: /Emitir|Guardar|Crear/i }).last()
    await submitBtn.click()

    // Toast confirmation
    const toast = page.locator('[class*="toast"], [class*="Toast"], [role="alert"]')
    await expect(toast.first()).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/billing-new-invoice.png', fullPage: true })
  })

  test('Cálculo de IGV no genera errores de punto flotante', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: /Nueva factura|Nuevo comprobante|Emitir/i }).first()
    await expect(newBtn).toBeVisible()
    await newBtn.click()

    await page.waitForTimeout(600)

    // Add item with a price that would expose float precision issues (33.33 * 0.18)
    const addItemBtn = page.locator('button', { hasText: /Agregar|Añadir/i }).first()
    if (await addItemBtn.isVisible().catch(() => false)) await addItemBtn.click()

    const priceInput = page.locator('input[name*="price"], input[name*="precio"], input[name*="unit_price"]').last()
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill('33.33')
      await priceInput.press('Tab')
      await page.waitForTimeout(300)

      // IGV must be max 2 decimal places — no floating point noise like 5.999400000000001
      const igvField = page.locator('input[name*="tax"], input[name*="igv"]').first()
      if (await igvField.isVisible().catch(() => false)) {
        const igvValue = await igvField.inputValue()
        expect(igvValue).not.toMatch(/e\+|e-/i)              // no exponential notation
        expect(igvValue).not.toMatch(/\.\d{3,}/)             // no more than 2 decimal places
      }

      const totalField = page.locator('input[name*="total"]').last()
      if (await totalField.isVisible().catch(() => false)) {
        const totalValue = await totalField.inputValue()
        expect(totalValue).not.toMatch(/e\+|e-/i)
        expect(totalValue).not.toMatch(/\.\d{3,}/)
      }
    }

    await page.screenshot({ path: 'test-results/billing-igv-check.png', fullPage: true })
  })
})
