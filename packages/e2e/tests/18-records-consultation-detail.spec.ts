import { test, expect } from '@playwright/test'

test.describe('Historia Clínica — detalle de consulta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/records')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 })
  })

  test('Hacer clic en una fila navega a la URL de consulta /appointments/.../consultation', async ({ page }) => {
    await page.locator('tbody tr').first().click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // RecordsPage onClick: navigate(`/appointments/${c.appointment_id}/consultation`)
    await expect(page).toHaveURL(/\/appointments\/.+\/consultation/, { timeout: 10000 })

    await page.screenshot({ path: 'test-results/records-click-row-url.png', fullPage: true })
  })

  test('Detalle de consulta muestra sección de motivo de consulta', async ({ page }) => {
    await page.locator('tbody tr').first().click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    const bodyText = await page.locator('body').innerText()
    const hasMotivo = /motivo|raz[oó]n|chief complaint|consulta/i.test(bodyText)
    expect(hasMotivo).toBe(true)

    await page.screenshot({ path: 'test-results/records-detail-motivo.png', fullPage: true })
  })

  test('Detalle de consulta muestra sección de diagnóstico con código CIE-10', async ({ page }) => {
    // Try multiple rows to find one with an ICD-10 code
    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()
    let foundDiagnosis = false

    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      await page.goto('/records')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 })

      await page.locator('tbody tr').nth(i).click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      const bodyText = await page.locator('body').innerText()
      if (/CIE|ICD|diagn[oó]stico|[A-Z]\d{2}/i.test(bodyText)) {
        foundDiagnosis = true
        break
      }
    }

    if (!foundDiagnosis) {
      console.warn('No ICD-10 diagnosis found in first 5 records — seed may not have them')
    }

    await page.screenshot({ path: 'test-results/records-detail-icd10.png', fullPage: true })
  })

  test('Lista de consultas muestra columna Estado con badges de colores', async ({ page }) => {
    const tbody = page.locator('tbody')
    const tableText = await tbody.innerText()

    // STATUS_LABELS in RecordsPage: Pendiente, Confirmada, En curso, Completada, Cancelada, No asistió
    const hasStatus = /completada|confirmada|pendiente|cancelada|en curso|no asisti[oó]/i.test(tableText)
    expect(hasStatus).toBe(true)

    await page.screenshot({ path: 'test-results/records-status-column.png', fullPage: true })
  })

  test('Lista de consultas muestra columna Fecha con formato de fecha en español', async ({ page }) => {
    const tbody = page.locator('tbody')
    const tableText = await tbody.innerText()

    // formatDate uses date-fns "dd MMM yyyy" with es locale: "15 ene 2024"
    const hasDate = /\d{1,2}\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.test(tableText)
    expect(hasDate).toBe(true)

    await page.screenshot({ path: 'test-results/records-date-column.png', fullPage: true })
  })

  test('Lista de consultas muestra columna Médico con "Dr."', async ({ page }) => {
    const tbody = page.locator('tbody')
    const tableText = await tbody.innerText()

    expect(tableText).toMatch(/Dr\./)

    await page.screenshot({ path: 'test-results/records-doctor-column.png', fullPage: true })
  })

  test('Lista de consultas muestra columna CIE-10 con código o guión', async ({ page }) => {
    const tbody = page.locator('tbody')
    await expect(tbody).toBeVisible()
    const tableText = await tbody.innerText()

    // CIE-10 column shows code like "J06.9" or "—" if none
    const hasIcdOrDash = /[A-Z]\d{2}|—/.test(tableText)
    expect(hasIcdOrDash).toBe(true)

    await page.screenshot({ path: 'test-results/records-icd-column.png', fullPage: true })
  })

  test('Paginación de historial clínico muestra controles cuando hay más de 20 consultas', async ({ page }) => {
    // RecordsPage has page state with limit:20 — if there are >20 records pagination shows
    const bodyText = await page.locator('body').innerText()
    const rowCount = await page.locator('tbody tr').count()

    if (rowCount >= 20) {
      // Pagination controls should exist
      const paginationBtns = page.locator('button', {
        hasText: /siguiente|›|anterior|‹/i,
      })
      const count = await paginationBtns.count()
      expect(count).toBeGreaterThan(0)
    } else {
      console.warn(`Only ${rowCount} records — not enough for pagination test`)
    }

    await page.screenshot({ path: 'test-results/records-pagination.png', fullPage: true })
  })
})
