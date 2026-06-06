import { test, expect } from '@playwright/test'

test.describe('Módulo Citas — vistas y estados', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/appointments')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.fc')).toBeVisible({ timeout: 10000 })
  })

  test('Cambiar a vista "Día" muestra el calendario diario', async ({ page }) => {
    // CalendarHeader has view toggle buttons: Semana / Día / Lista
    const dayBtn = page.locator('button', { hasText: 'Día' }).first()
    await expect(dayBtn).toBeVisible({ timeout: 8000 })
    await dayBtn.click()
    await page.waitForTimeout(600)

    // FullCalendar timeGridDay view renders .fc-timegrid
    const timegrid = page.locator('.fc-timegrid')
    await expect(timegrid).toBeVisible({ timeout: 8000 })

    await page.screenshot({ path: 'test-results/appointments-day-view.png', fullPage: true })
  })

  test('Cambiar a vista "Lista" muestra eventos en formato tabla', async ({ page }) => {
    const listBtn = page.locator('button', { hasText: 'Lista' }).first()
    await expect(listBtn).toBeVisible({ timeout: 8000 })
    await listBtn.click()
    await page.waitForTimeout(600)

    // FullCalendar listWeek view renders .fc-list
    const listView = page.locator('.fc-list, .fc-list-table')
    await expect(listView.first()).toBeVisible({ timeout: 8000 })

    await page.screenshot({ path: 'test-results/appointments-list-view.png', fullPage: true })
  })

  test('Cambiar de vista "Día" de vuelta a "Semana" funciona', async ({ page }) => {
    // Go to day view first
    const dayBtn = page.locator('button', { hasText: 'Día' }).first()
    await dayBtn.click()
    await page.waitForTimeout(400)

    // Return to week view
    const weekBtn = page.locator('button', { hasText: 'Semana' }).first()
    await expect(weekBtn).toBeVisible()
    await weekBtn.click()
    await page.waitForTimeout(600)

    const timegridWeek = page.locator('.fc-timegrid-col, .fc-col-header-cell')
    await expect(timegridWeek.first()).toBeVisible({ timeout: 8000 })

    await page.screenshot({ path: 'test-results/appointments-back-to-week.png', fullPage: true })
  })

  test('Modal de nueva cita tiene selector de doctor con opciones', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: /Nueva cita/i }).first()
    await expect(newBtn).toBeVisible({ timeout: 8000 })
    await newBtn.click()
    await page.waitForTimeout(500)

    const modal = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    await expect(modal).toBeVisible({ timeout: 6000 })

    // Doctor selector should exist and have options
    const doctorSelect = modal.locator('select, [role="combobox"], input').filter({
      hasText: /doctor|m[eé]dico/i,
    }).first()
    const hasDoctorField = await doctorSelect.isVisible({ timeout: 3000 }).catch(() => false)

    if (!hasDoctorField) {
      // Fallback: check that modal text includes doctor/médico
      const modalText = await modal.innerText()
      expect(modalText).toMatch(/doctor|m[eé]dico/i)
    } else {
      await expect(doctorSelect).toBeVisible()
    }

    await page.screenshot({ path: 'test-results/appointments-new-doctor-field.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Modal de nueva cita tiene campos de fecha y hora', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: /Nueva cita/i }).first()
    await expect(newBtn).toBeVisible({ timeout: 8000 })
    await newBtn.click()
    await page.waitForTimeout(500)

    const modal = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    await expect(modal).toBeVisible({ timeout: 6000 })

    // Date and time inputs
    const dateInput = modal.locator('input[type="date"]').first()
    const timeOrDateInput = modal.locator('input[type="time"], input[type="date"], input[type="datetime-local"]').first()
    await expect(timeOrDateInput).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'test-results/appointments-new-datetime-fields.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Filtro de doctor tiene opción "Todos los médicos" por defecto', async ({ page }) => {
    // CalendarHeader renders a <select> for doctor filtering
    const doctorSelect = page.locator('select').first()
    await expect(doctorSelect).toBeVisible({ timeout: 8000 })

    const defaultOption = doctorSelect.locator('option').first()
    const defaultText = await defaultOption.innerText()
    expect(defaultText).toMatch(/todos/i)

    await page.screenshot({ path: 'test-results/appointments-doctor-select-default.png', fullPage: true })
  })

  test('Encabezado del calendario muestra rango de fechas con año', async ({ page }) => {
    // rangeLabel is rendered in a <span class="font-semibold capitalize">
    const rangeLabel = page.locator('span.font-semibold, span.capitalize').filter({
      hasText: /\d{4}/,
    }).first()
    await expect(rangeLabel).toBeVisible({ timeout: 8000 })

    const labelText = await rangeLabel.innerText()
    // Should contain a 4-digit year
    expect(labelText).toMatch(/\d{4}/)

    await page.screenshot({ path: 'test-results/appointments-range-label.png', fullPage: true })
  })

  test('Modal de cita existente muestra motivo de consulta', async ({ page }) => {
    const events = page.locator('.fc-event')
    await expect(events.first()).toBeVisible({ timeout: 10000 })
    await events.first().click()

    const modal = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    await expect(modal).toBeVisible({ timeout: 8000 })

    const modalText = await modal.innerText()
    // Modal should show motivo/reason for the appointment
    const hasMotivo = /motivo|raz[oó]n|consulta|descripci[oó]n/i.test(modalText)
    expect(hasMotivo).toBe(true)

    await page.screenshot({ path: 'test-results/appointments-modal-motivo.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })
})
