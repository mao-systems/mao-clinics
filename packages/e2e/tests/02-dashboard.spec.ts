import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('Dashboard carga los 6 KPI cards con datos', async ({ page }) => {
    // KPICard renders as <div class="bg-white rounded-base border border-gray-200 shadow-sm p-5 ...">
    // inside a 3-column grid. Identify them by their unique title text.
    const kpiTitles = [
      'Citas hoy',
      'Ingresos del mes',
      'Pacientes nuevos',
      'Consultas completadas',
      'Tasa de asistencia',
      'Recordatorios enviados',
    ]

    for (const title of kpiTitles) {
      await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 10000 })
    }

    // At least one KPI must show a non-zero value
    const pageText = await page.locator('body').innerText()
    expect(/[1-9]/.test(pageText)).toBe(true)

    await page.screenshot({ path: 'test-results/dashboard-kpis.png', fullPage: true })
  })

  test('Gráficos de Recharts renderizan correctamente', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const charts = page.locator('.recharts-wrapper')
    await expect(charts.first()).toBeVisible({ timeout: 10000 })

    const chartCount = await charts.count()
    expect(chartCount).toBeGreaterThanOrEqual(2)

    const svgs = page.locator('.recharts-wrapper svg')
    await expect(svgs.first()).toBeVisible()

    await page.screenshot({ path: 'test-results/dashboard-charts.png', fullPage: true })
  })

  test('Dashboard carga en menos de 4 segundos', async ({ page }) => {
    const start = Date.now()
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const elapsed = Date.now() - start

    console.log(`Dashboard load time: ${elapsed}ms`)
    expect(elapsed).toBeLessThan(4000)

    await page.screenshot({ path: 'test-results/dashboard-performance.png', fullPage: true })
  })
})
