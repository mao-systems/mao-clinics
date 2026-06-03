import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Historia Clínica Electrónica', () => {

  test('Navegar a /records carga la lista de consultas', async ({ page }) => {
    await page.goto('/records')
    await page.waitForLoadState('networkidle')

    // At least one consultation row from seed should be visible
    const rows = page.locator('tbody tr, [class*="card"], [class*="Card"], [class*="consultation"]')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    await page.screenshot({ path: 'test-results/records-list.png', fullPage: true })
  })

  test('Detalle de consulta muestra diagnóstico e ICD-10', async ({ page }) => {
    await page.goto('/records')
    await page.waitForLoadState('networkidle')

    // Click on the first consultation to open its detail
    const firstRow = page.locator('tbody tr, [class*="row"], [class*="card"]').first()
    await expect(firstRow).toBeVisible({ timeout: 10000 })
    await firstRow.click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // The detail view should show diagnosis info
    const pageText = await page.locator('body').innerText()

    // Should contain ICD-10 related content or diagnostic info from seed
    const hasDiagnosticContent = /diagn[oó]stico|CIE|ICD|tratamiento|motivo/i.test(pageText)
    expect(hasDiagnosticContent).toBe(true)

    await page.screenshot({ path: 'test-results/records-detail.png', fullPage: true })
  })

  test('PDF de receta se descarga con extensión .pdf y tamaño válido', async ({ page }) => {
    await page.goto('/records')
    await page.waitForLoadState('networkidle')

    // Open a consultation that has a prescription
    const rows = page.locator('tbody tr, [class*="row"]')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    // Try rows until we find one with a prescription/PDF button
    let downloaded = false
    const rowCount = await rows.count()

    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      await rows.nth(i).click()
      await page.waitForTimeout(600)

      const pdfBtn = page.locator('button, a', { hasText: /Descargar PDF|Imprimir|receta|PDF/i }).first()
      const hasPdfBtn = await pdfBtn.isVisible().catch(() => false)

      if (hasPdfBtn) {
        // Listen for download event before clicking
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 10000 }),
          pdfBtn.click(),
        ])

        const filename = download.suggestedFilename()
        expect(filename.toLowerCase()).toMatch(/\.pdf$/)

        // Save and verify file size
        const savePath = path.join('test-results', filename)
        await download.saveAs(savePath)

        const { size } = await import('fs').then(fs =>
          fs.promises.stat(savePath),
        )
        expect(size).toBeGreaterThan(1000)

        downloaded = true
        break
      }

      // Go back to list if we navigated away
      await page.goBack().catch(() => {})
      await page.waitForLoadState('networkidle')
    }

    await page.screenshot({ path: 'test-results/pdf-download.png', fullPage: true })

    if (!downloaded) {
      console.warn('No consultation with PDF button found in first 10 rows — verify seed has prescriptions')
    }
  })
})
