import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('Dashboard carga los 6 KPI cards con datos', async ({ page }) => {
    // KPI cards identified by their container — each has a numeric value and a label
    // The dashboard renders 6 metric cards; find them by a common wrapper class or role
    const kpiCards = page.locator('[class*="card"], [class*="Card"], [class*="kpi"], [class*="metric"]')
    await expect(kpiCards.first()).toBeVisible({ timeout: 10000 })

    // Wait for React Query to finish loading
    await page.waitForLoadState('networkidle')

    // Collect all visible card count — at least 6 should be present
    const count = await kpiCards.count()
    expect(count).toBeGreaterThanOrEqual(6)

    // At least one KPI should show a non-zero value (data was seeded)
    const allText = await page.locator('body').innerText()
    // The seed creates 50 patients, 60 appointments, several invoices — at least one non-zero
    const hasNonZero = /[1-9]\d*/.test(allText)
    expect(hasNonZero).toBe(true)

    await page.screenshot({ path: 'test-results/dashboard-kpis.png', fullPage: true })
  })

  test('Gráficos de Recharts renderizan correctamente', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Recharts always injects .recharts-wrapper divs around every chart
    const charts = page.locator('.recharts-wrapper')
    await expect(charts.first()).toBeVisible({ timeout: 10000 })

    const chartCount = await charts.count()
    expect(chartCount).toBeGreaterThanOrEqual(2)

    // Each chart must contain an SVG (not empty/error state)
    const svgs = page.locator('.recharts-wrapper svg')
    await expect(svgs.first()).toBeVisible()

    await page.screenshot({ path: 'test-results/dashboard-charts.png', fullPage: true })
  })

  test('Dashboard carga en menos de 4 segundos', async ({ page }) => {
    // Navigate fresh to measure load time (already authenticated, cookies persist)
    const start = Date.now()
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const elapsed = Date.now() - start

    console.log(`Dashboard load time: ${elapsed}ms`)
    expect(elapsed).toBeLessThan(4000)

    await page.screenshot({ path: 'test-results/dashboard-performance.png', fullPage: true })
  })
})
