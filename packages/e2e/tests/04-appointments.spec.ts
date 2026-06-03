import { test, expect } from '@playwright/test'

test.describe('Módulo Citas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/appointments')
    await page.waitForLoadState('networkidle')
  })

  test('FullCalendar carga y muestra eventos del seed', async ({ page }) => {
    const calendar = page.locator('.fc')
    await expect(calendar).toBeVisible({ timeout: 10000 })

    const events = page.locator('.fc-event')
    await expect(events.first()).toBeVisible({ timeout: 10000 })

    const eventCount = await events.count()
    expect(eventCount).toBeGreaterThan(0)

    await page.screenshot({ path: 'test-results/calendar-loaded.png', fullPage: true })
  })

  test('Horas del calendario están en horario Lima (no UTC)', async ({ page }) => {
    const calendar = page.locator('.fc')
    await expect(calendar).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    const eventTimes = page.locator('.fc-event-time, .fc-timegrid-event .fc-event-time')
    const timeCount = await eventTimes.count()

    if (timeCount > 0) {
      for (let i = 0; i < Math.min(timeCount, 5); i++) {
        const timeText = await eventTimes.nth(i).innerText()
        const match = timeText.match(/(\d{1,2}):\d{2}/)
        if (match) {
          const hour = parseInt(match[1], 10)
          expect(hour).toBeGreaterThanOrEqual(7)
          expect(hour).toBeLessThanOrEqual(22)
        }
      }
    }

    // Time axis labels should show Lima business hours (7am onwards), not UTC midnight
    const axisLabels = page.locator('.fc-timegrid-slot-label-cushion')
    const axisCount = await axisLabels.count()
    if (axisCount > 0) {
      const firstLabel = await axisLabels.first().innerText()
      console.log(`First time axis label: ${firstLabel}`)
      expect(firstLabel).not.toMatch(/^0[0-6]/)
    }

    await page.screenshot({ path: 'test-results/calendar-timezone.png', fullPage: true })
  })

  test('Clic en evento abre modal con detalles de la cita', async ({ page }) => {
    const calendar = page.locator('.fc')
    await expect(calendar).toBeVisible({ timeout: 10000 })

    const events = page.locator('.fc-event')
    await expect(events.first()).toBeVisible({ timeout: 10000 })

    await events.first().click()

    // AppointmentDetailModal renders as:
    //   div.fixed.inset-0.z-50 > div.absolute (backdrop) + div.relative.bg-white.shadow-xl (panel)
    const modalPanel = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    await expect(modalPanel).toBeVisible({ timeout: 8000 })

    const modalText = await modalPanel.innerText()
    expect(modalText.length).toBeGreaterThan(10)

    // Modal shows patient last name, doctor, and appointment details
    const hasMedicalContent = /médico|paciente|doctor|dr\.|dra\.|duración|motivo|minutos/i.test(modalText)
    expect(hasMedicalContent).toBe(true)

    await page.screenshot({ path: 'test-results/appointment-detail-modal.png', fullPage: true })
  })
})
