import { test, expect, type Page } from '@playwright/test'

// ── Viewport presets ──────────────────────────────────────────────────────────

const MOBILE  = { width: 390,  height: 844  } // iPhone 14
const TABLET  = { width: 768,  height: 1024 } // iPad
const DESKTOP = { width: 1280, height: 800  } // standard laptop

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goToDashboard(page: Page) {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
}

/** Returns the sidebar's left edge x-coordinate (negative = off-screen) */
async function sidebarX(page: Page) {
  return page.locator('[data-testid="sidebar"]').evaluate(
    (el) => el.getBoundingClientRect().x,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Mobile layout — sidebar hidden, hamburger visible
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive — móvil (390 × 844)', () => {
  test.use({ viewport: MOBILE })

  test.beforeEach(async ({ page }) => {
    await goToDashboard(page)
  })

  test('Sidebar está oculto por defecto en móvil', async ({ page }) => {
    const x = await sidebarX(page)
    expect(x).toBeLessThan(0)
    await page.screenshot({ path: 'test-results/responsive-mobile-sidebar-hidden.png', fullPage: false })
  })

  test('Botón de hamburguesa es visible en móvil', async ({ page }) => {
    const menuBtn = page.locator('[data-testid="menu-button"]')
    await expect(menuBtn).toBeVisible()
    await page.screenshot({ path: 'test-results/responsive-mobile-hamburger.png', fullPage: false })
  })

  test('Clic en hamburguesa abre el sidebar', async ({ page }) => {
    await page.locator('[data-testid="menu-button"]').click()
    await page.waitForTimeout(400) // wait for CSS transition

    const x = await sidebarX(page)
    expect(x).toBeGreaterThanOrEqual(0)

    // Backdrop should be visible
    await expect(page.locator('[data-testid="sidebar-backdrop"]')).toBeVisible()

    await page.screenshot({ path: 'test-results/responsive-mobile-sidebar-open.png', fullPage: false })
  })

  test('Clic en el backdrop cierra el sidebar', async ({ page }) => {
    // Open
    await page.locator('[data-testid="menu-button"]').click()
    await page.waitForTimeout(400)

    // Click backdrop
    await page.locator('[data-testid="sidebar-backdrop"]').click()
    await page.waitForTimeout(400)

    const x = await sidebarX(page)
    expect(x).toBeLessThan(0)

    await page.screenshot({ path: 'test-results/responsive-mobile-sidebar-backdrop-close.png', fullPage: false })
  })

  test('Botón X dentro del sidebar cierra el sidebar', async ({ page }) => {
    // Open
    await page.locator('[data-testid="menu-button"]').click()
    await page.waitForTimeout(400)

    // Click close button inside sidebar
    await page.locator('[data-testid="sidebar-close"]').click()
    await page.waitForTimeout(400)

    const x = await sidebarX(page)
    expect(x).toBeLessThan(0)

    await page.screenshot({ path: 'test-results/responsive-mobile-sidebar-close-btn.png', fullPage: false })
  })

  test('Navegar por enlace del sidebar cierra el sidebar', async ({ page }) => {
    // Open
    await page.locator('[data-testid="menu-button"]').click()
    await page.waitForTimeout(400)

    // Click a nav link (Pacientes)
    await page.getByRole('link', { name: 'Pacientes' }).click()
    await page.waitForTimeout(400)

    const x = await sidebarX(page)
    expect(x).toBeLessThan(0)

    await page.screenshot({ path: 'test-results/responsive-mobile-nav-link-closes.png', fullPage: false })
  })

  test('Dashboard: tarjetas KPI se muestran en columna única en móvil', async ({ page }) => {
    // The KPI grid uses grid-cols-1 on mobile — all cards should stack vertically
    // We verify by checking bounding boxes of consecutive KPI cards
    const kpiCards = page.locator('text=Citas hoy').locator('..').locator('..')
    await expect(kpiCards.first()).toBeVisible({ timeout: 10000 })

    // Check that "Ingresos del mes" is below "Citas hoy" (y position greater)
    const citasBox   = await page.getByText('Citas hoy',       { exact: true }).boundingBox()
    const ingresosBox = await page.getByText('Ingresos del mes', { exact: true }).boundingBox()
    expect(citasBox).not.toBeNull()
    expect(ingresosBox).not.toBeNull()

    // In single column layout, Ingresos should be below Citas (higher y)
    if (citasBox && ingresosBox) {
      expect(ingresosBox.y).toBeGreaterThan(citasBox.y + citasBox.height - 10)
    }

    await page.screenshot({ path: 'test-results/responsive-mobile-kpi-single-col.png', fullPage: true })
  })

  test('Página de login es usable en móvil', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1', { hasText: 'MAO Clinics' })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    // Form card should fit within viewport width
    const card = page.locator('form').locator('..')
    const box  = await card.boundingBox()
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(MOBILE.width + 1)
    }

    await page.screenshot({ path: 'test-results/responsive-mobile-login.png', fullPage: true })
  })

  test('Página de pacientes carga correctamente en móvil', async ({ page }) => {
    await page.goto('/patients')
    await page.waitForLoadState('networkidle')

    // Page header title should be visible
    await expect(page.getByText('Pacientes', { exact: true }).first()).toBeVisible()

    // Table should be rendered (with overflow-x-auto)
    const tableContainer = page.locator('.overflow-x-auto').first()
    await expect(tableContainer).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/responsive-mobile-patients.png', fullPage: true })
  })

  test('Página de citas usa vista lista en móvil', async ({ page }) => {
    await page.goto('/appointments')
    await page.waitForLoadState('networkidle')

    // On mobile, the list view button should be active
    // The view toggle buttons are in the CalendarHeader
    const listBtn = page.getByRole('button', { name: 'Lista' })
    await expect(listBtn).toBeVisible({ timeout: 10000 })

    // The "Lista" button should have the active class (bg-primary text-white)
    const listBtnClass = await listBtn.getAttribute('class')
    expect(listBtnClass).toContain('bg-primary')

    await page.screenshot({ path: 'test-results/responsive-mobile-appointments-list.png', fullPage: true })
  })

  test('Página de facturación carga en móvil', async ({ page }) => {
    await page.goto('/billing')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Facturación', { exact: true }).first()).toBeVisible()

    await page.screenshot({ path: 'test-results/responsive-mobile-billing.png', fullPage: true })
  })

  test('Página de historial clínico carga en móvil', async ({ page }) => {
    await page.goto('/records')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Historial clínico').first()).toBeVisible()

    await page.screenshot({ path: 'test-results/responsive-mobile-records.png', fullPage: true })
  })

  test('Página de administración carga en móvil', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Configuración').first()).toBeVisible()

    await page.screenshot({ path: 'test-results/responsive-mobile-admin.png', fullPage: true })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Tablet layout (768 × 1024) — sidebar still hidden (< lg: 1024px)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive — tablet (768 × 1024)', () => {
  test.use({ viewport: TABLET })

  test.beforeEach(async ({ page }) => {
    await goToDashboard(page)
  })

  test('Sidebar está oculto en tablet (< 1024 px)', async ({ page }) => {
    const x = await sidebarX(page)
    expect(x).toBeLessThan(0)
    await page.screenshot({ path: 'test-results/responsive-tablet-sidebar-hidden.png', fullPage: false })
  })

  test('Botón hamburguesa visible en tablet', async ({ page }) => {
    await expect(page.locator('[data-testid="menu-button"]')).toBeVisible()
  })

  test('Sidebar se abre desde hamburguesa en tablet', async ({ page }) => {
    await page.locator('[data-testid="menu-button"]').click()
    await page.waitForTimeout(400)

    const x = await sidebarX(page)
    expect(x).toBeGreaterThanOrEqual(0)

    await page.screenshot({ path: 'test-results/responsive-tablet-sidebar-open.png', fullPage: false })
  })

  test('Dashboard: tarjetas KPI en 2 columnas en tablet (sm breakpoint)', async ({ page }) => {
    const citasBox    = await page.getByText('Citas hoy',       { exact: true }).boundingBox()
    const ingresosBox = await page.getByText('Ingresos del mes', { exact: true }).boundingBox()
    expect(citasBox).not.toBeNull()
    expect(ingresosBox).not.toBeNull()

    // sm:grid-cols-2 → at 768px the cards should be side-by-side (same row ~ same y)
    if (citasBox && ingresosBox) {
      const sameRow = Math.abs(ingresosBox.y - citasBox.y) < 10
      expect(sameRow).toBe(true)
    }

    await page.screenshot({ path: 'test-results/responsive-tablet-kpi-2-col.png', fullPage: true })
  })

  test('Todas las páginas cargan sin desbordamiento en tablet', async ({ page }) => {
    const routes = ['/patients', '/appointments', '/records', '/billing', '/admin']

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      // No horizontal scrollbar — body should not overflow
      const hasHorizontalScroll = await page.evaluate(() =>
        document.body.scrollWidth > window.innerWidth,
      )
      expect(hasHorizontalScroll).toBe(false)

      await page.screenshot({
        path: `test-results/responsive-tablet${route.replace('/', '-')}.png`,
        fullPage: false,
      })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Desktop layout (1280 × 800) — sidebar always visible
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive — escritorio (1280 × 800)', () => {
  test.use({ viewport: DESKTOP })

  test.beforeEach(async ({ page }) => {
    await goToDashboard(page)
  })

  test('Sidebar siempre visible en escritorio', async ({ page }) => {
    const x = await sidebarX(page)
    expect(x).toBeGreaterThanOrEqual(0)

    await page.screenshot({ path: 'test-results/responsive-desktop-sidebar-visible.png', fullPage: false })
  })

  test('Botón hamburguesa NO es visible en escritorio', async ({ page }) => {
    const menuBtn = page.locator('[data-testid="menu-button"]')
    await expect(menuBtn).not.toBeVisible()
  })

  test('Sidebar permanece visible después de navegar', async ({ page }) => {
    await page.getByRole('link', { name: 'Pacientes' }).click()
    await page.waitForLoadState('networkidle')

    const x = await sidebarX(page)
    expect(x).toBeGreaterThanOrEqual(0)

    await page.screenshot({ path: 'test-results/responsive-desktop-sidebar-after-nav.png', fullPage: false })
  })

  test('Dashboard: tarjetas KPI en 3 columnas en escritorio (lg breakpoint)', async ({ page }) => {
    const citasBox              = await page.getByText('Citas hoy',              { exact: true }).boundingBox()
    const ingresosBox           = await page.getByText('Ingresos del mes',       { exact: true }).boundingBox()
    const pacientesBox          = await page.getByText('Pacientes nuevos',       { exact: true }).boundingBox()
    const consultasBox          = await page.getByText('Consultas completadas',  { exact: true }).boundingBox()

    expect(citasBox).not.toBeNull()
    expect(ingresosBox).not.toBeNull()
    expect(pacientesBox).not.toBeNull()
    expect(consultasBox).not.toBeNull()

    if (citasBox && ingresosBox && pacientesBox && consultasBox) {
      // First 3 cards should be on the same row (lg:grid-cols-3)
      const row1Y = citasBox.y
      expect(Math.abs(ingresosBox.y  - row1Y)).toBeLessThan(10)
      expect(Math.abs(pacientesBox.y - row1Y)).toBeLessThan(10)
      // 4th card (Consultas) starts a new row
      expect(consultasBox.y).toBeGreaterThan(row1Y + citasBox.height - 10)
    }

    await page.screenshot({ path: 'test-results/responsive-desktop-kpi-3-col.png', fullPage: true })
  })

  test('Citas usa vista semana en escritorio', async ({ page }) => {
    await page.goto('/appointments')
    await page.waitForLoadState('networkidle')

    const weekBtn = page.getByRole('button', { name: 'Semana', exact: true })
    await expect(weekBtn).toBeVisible({ timeout: 10000 })

    const weekBtnClass = await weekBtn.getAttribute('class')
    expect(weekBtnClass).toContain('bg-primary')

    await page.screenshot({ path: 'test-results/responsive-desktop-appointments-week.png', fullPage: false })
  })

  test('Todas las páginas cargan sin desbordamiento en escritorio', async ({ page }) => {
    const routes = ['/patients', '/appointments', '/records', '/billing', '/admin']

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const hasHorizontalScroll = await page.evaluate(() =>
        document.body.scrollWidth > window.innerWidth,
      )
      expect(hasHorizontalScroll).toBe(false)

      await page.screenshot({
        path: `test-results/responsive-desktop${route.replace('/', '-')}.png`,
        fullPage: false,
      })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Cross-viewport — layout integrity across all breakpoints
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive — integridad en múltiples breakpoints', () => {
  const viewports = [
    { name: 'movil',     size: MOBILE  },
    { name: 'tablet',    size: TABLET  },
    { name: 'escritorio', size: DESKTOP },
  ]

  for (const { name, size } of viewports) {
    test(`Navbar visible en ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await goToDashboard(page)

      await expect(page.locator('header')).toBeVisible()
    })

    test(`Contenido principal no desborda en ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await goToDashboard(page)

      const hasHorizontalScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > window.innerWidth,
      )
      expect(hasHorizontalScroll).toBe(false)
    })

    test(`Login carga y es funcional en ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.context().clearCookies()
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('h1', { hasText: 'MAO Clinics' })).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      await page.screenshot({
        path: `test-results/responsive-${name}-login.png`,
        fullPage: true,
      })
    })
  }

  test('Paginación compacta visible en móvil (pacientes)', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto('/patients')
    await page.waitForLoadState('networkidle')

    // Pagination navigation buttons should be visible
    const prevBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
    // At least the chevron buttons should be present in DOM
    const paginationArea = page.locator('.bg-gray-50').last()
    const box = await paginationArea.boundingBox()
    if (box) {
      // Pagination bar should fit within viewport
      expect(box.x + box.width).toBeLessThanOrEqual(MOBILE.width + 1)
    }

    await page.screenshot({ path: 'test-results/responsive-mobile-patients-pagination.png', fullPage: true })
  })
})
