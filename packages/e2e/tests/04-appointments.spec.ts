import { test, expect } from '@playwright/test'

test.describe('Módulo Citas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/appointments')
    await page.waitForLoadState('networkidle')
  })

  test('FullCalendar carga y muestra eventos del seed', async ({ page }) => {
    // FullCalendar always renders with class "fc" on the root container
    const calendar = page.locator('.fc')
    await expect(calendar).toBeVisible({ timeout: 10000 })

    // Seed creates appointments for today/tomorrow — at least one event should be visible
    const events = page.locator('.fc-event')
    await expect(events.first()).toBeVisible({ timeout: 10000 })

    const eventCount = await events.count()
    expect(eventCount).toBeGreaterThan(0)

    await page.screenshot({ path: 'test-results/calendar-loaded.png', fullPage: true })
  })

  test('Horas del calendario están en horario Lima (no UTC)', async ({ page }) => {
    const calendar = page.locator('.fc')
    await expect(calendar).toBeVisible({ timeout: 10000 })

    await page.waitForTimeout(1000) // let events fully render

    // Read displayed time from calendar events
    const eventTimes = page.locator('.fc-event-time, .fc-event .fc-time, [class*="fc-event"] time')
    const timeCount = await eventTimes.count()

    if (timeCount > 0) {
      for (let i = 0; i < Math.min(timeCount, 5); i++) {
        const timeText = await eventTimes.nth(i).innerText()
        // Parse the hour from "HH:MM" or "H:MM AM/PM" format
        const match = timeText.match(/(\d{1,2}):\d{2}/)
        if (match) {
          const hour = parseInt(match[1], 10)
          // Clinic hours seed: 8–17. If UTC it would shift by 5h → 3–12 UTC
          // Valid Lima clinic hours: 7–22. UTC bug would show 0–6.
          expect(hour).toBeGreaterThanOrEqual(7)
          expect(hour).toBeLessThanOrEqual(22)
        }
      }
    }

    // Also verify the calendar time axis labels are Lima hours (7am–7pm range typical)
    const timeAxis = page.locator('.fc-timegrid-slot-label-cushion, .fc-time')
    const axisCount = await timeAxis.count()
    if (axisCount > 0) {
      const firstLabel = await timeAxis.first().innerText()
      console.log(`First time axis label: ${firstLabel}`)
      // Should not show 00:00 or 01:00 (UTC artifact)
      expect(firstLabel).not.toMatch(/^0[0-6]/)
    }

    await page.screenshot({ path: 'test-results/calendar-timezone.png', fullPage: true })
  })

  test('Clic en evento abre modal con detalles de la cita', async ({ page }) => {
    const calendar = page.locator('.fc')
    await expect(calendar).toBeVisible({ timeout: 10000 })

    const events = page.locator('.fc-event')
    await expect(events.first()).toBeVisible({ timeout: 10000 })

    // Click the first visible event
    await events.first().click()

    // A modal/dialog should appear
    const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="dialog"]')
    await expect(modal.first()).toBeVisible({ timeout: 8000 })

    // Modal must contain meaningful content — patient name and doctor name
    const modalText = await modal.first().innerText()
    expect(modalText.length).toBeGreaterThan(10) // not empty

    // Should contain at least one recognizable field label
    const hasPatientOrDoctor = /paciente|doctor|médico|dr\.|dra\./i.test(modalText)
    expect(hasPatientOrDoctor).toBe(true)

    await page.screenshot({ path: 'test-results/appointment-detail-modal.png', fullPage: true })
  })
})
