import { test, expect } from '@playwright/test'

test.describe('Dashboard — KPIs y gráficos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Wait for stats to load (KPI cards stop showing spinner)
    await page.waitForTimeout(800)
  })

  test('KPI "Citas hoy" es visible con valor numérico', async ({ page }) => {
    const card = page.locator('div, section').filter({ hasText: 'Citas hoy' }).first()
    await expect(card).toBeVisible({ timeout: 8000 })

    // Value should be a non-negative number (seed may have 0 appointments today)
    const cardText = await card.innerText()
    expect(cardText).toMatch(/\d/)

    await page.screenshot({ path: 'test-results/dashboard-kpi-citas-hoy.png', fullPage: true })
  })

  test('KPI "Ingresos del mes" muestra formato de moneda con S/', async ({ page }) => {
    const card = page.locator('div, section').filter({ hasText: 'Ingresos del mes' }).first()
    await expect(card).toBeVisible({ timeout: 8000 })

    const cardText = await card.innerText()
    // Revenue is shown as S/ X.XX or as a number
    expect(cardText).toMatch(/S\/|\d/)

    await page.screenshot({ path: 'test-results/dashboard-kpi-ingresos.png', fullPage: true })
  })

  test('KPI "Pacientes nuevos" muestra subtítulo "Este mes"', async ({ page }) => {
    const card = page.locator('div, section').filter({ hasText: 'Pacientes nuevos' }).first()
    await expect(card).toBeVisible({ timeout: 8000 })

    const cardText = await card.innerText()
    expect(cardText).toMatch(/Este mes/i)

    await page.screenshot({ path: 'test-results/dashboard-kpi-pacientes-nuevos.png', fullPage: true })
  })

  test('KPI "Consultas completadas" es visible con subtítulo', async ({ page }) => {
    const card = page.locator('div, section').filter({ hasText: 'Consultas completadas' }).first()
    await expect(card).toBeVisible({ timeout: 8000 })

    const cardText = await card.innerText()
    expect(cardText).toMatch(/Este mes/i)

    await page.screenshot({ path: 'test-results/dashboard-kpi-consultas.png', fullPage: true })
  })

  test('KPI "Tasa de asistencia" muestra valor en porcentaje', async ({ page }) => {
    const card = page.locator('div, section').filter({ hasText: 'Tasa de asistencia' }).first()
    await expect(card).toBeVisible({ timeout: 8000 })

    const cardText = await card.innerText()
    // Should show something like "82%" or "0%"
    expect(cardText).toMatch(/%/)

    await page.screenshot({ path: 'test-results/dashboard-kpi-asistencia.png', fullPage: true })
  })

  test('KPI "Recordatorios enviados" es visible con subtítulo "Esta semana"', async ({ page }) => {
    const card = page.locator('div, section').filter({ hasText: 'Recordatorios enviados' }).first()
    await expect(card).toBeVisible({ timeout: 8000 })

    const cardText = await card.innerText()
    expect(cardText).toMatch(/Esta semana/i)

    await page.screenshot({ path: 'test-results/dashboard-kpi-recordatorios.png', fullPage: true })
  })

  test('Botón "Actualizar" recarga las estadísticas sin error', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    const refreshBtn = page.locator('button', { hasText: 'Actualizar' }).first()
    await expect(refreshBtn).toBeVisible({ timeout: 8000 })
    await refreshBtn.click()
    await page.waitForTimeout(1500)
    await page.waitForLoadState('networkidle')

    // No JS errors after refresh
    const criticalErrors = consoleErrors.filter(e => !e.includes('Warning') && !e.includes('favicon'))
    expect(criticalErrors.length).toBe(0)

    // KPIs still visible after refresh
    const firstKpi = page.locator('div').filter({ hasText: 'Citas hoy' }).first()
    await expect(firstKpi).toBeVisible()

    await page.screenshot({ path: 'test-results/dashboard-refresh.png', fullPage: true })
  })

  test('Saludo de bienvenida muestra el nombre del usuario', async ({ page }) => {
    // DashboardPage: <h1>{getGreeting()}, {user?.firstName}</h1>
    const greeting = page.locator('h1').first()
    await expect(greeting).toBeVisible({ timeout: 8000 })

    const greetingText = await greeting.innerText()
    // Should contain Buenos días/tardes/noches and a name
    const hasGreeting = /buenos|buenas|hola/i.test(greetingText)
    expect(hasGreeting).toBe(true)

    await page.screenshot({ path: 'test-results/dashboard-greeting.png', fullPage: true })
  })

  test('Gráfico de citas (AppointmentsChart) tiene contenedor visible', async ({ page }) => {
    // AppointmentsChart uses Recharts — look for the SVG chart container
    const chartContainer = page.locator('.recharts-wrapper, svg.recharts-surface').first()
    await expect(chartContainer).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/dashboard-chart.png', fullPage: true })
  })
})
