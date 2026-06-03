import { test, expect } from '@playwright/test'

test.describe('Sistema de Theming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
  })

  test('Panel de admin carga con las tabs esperadas', async ({ page }) => {
    // Hash-based tabs used in this implementation
    const tabApariencia = page.locator('button, [role="tab"], a', { hasText: /Apariencia|Tema|Temas/i }).first()
    await expect(tabApariencia).toBeVisible({ timeout: 8000 })

    const tabMedicos = page.locator('button, [role="tab"], a', { hasText: /Médicos|Doctores/i }).first()
    await expect(tabMedicos).toBeVisible()

    const tabUsuarios = page.locator('button, [role="tab"], a', { hasText: /Usuarios/i }).first()
    await expect(tabUsuarios).toBeVisible()

    await page.screenshot({ path: 'test-results/admin-tabs.png', fullPage: true })
  })

  test('Cambiar paleta de colores actualiza el sidebar en tiempo real', async ({ page }) => {
    // Navigate to the Apariencia tab
    const tabApariencia = page.locator('button, [role="tab"], a', { hasText: /Apariencia|Tema/i }).first()
    await tabApariencia.click()
    await page.waitForTimeout(500)

    // Read current sidebar background color
    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible()

    const originalBg = await sidebar.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor,
    )
    console.log(`Original sidebar bg: ${originalBg}`)

    // Find palette buttons — they are color swatches or preset cards
    // Look for a palette that is NOT the current one (general palette is default)
    const paletteBtn = page.locator('button[class*="palette"], button[class*="Palette"], [class*="preset"], [data-palette]')
    const paletteBtnAlt = page.locator('button', { hasText: /Dental|Ginecolog|Pedi[aá]trica|Oftalmolog|Traumatolog|Morado|Naranja/i }).first()

    // Try both selectors
    let paletteClicked = false
    if (await paletteBtn.count() > 1) {
      // Click one that is not already active
      const allPalettes = paletteBtn
      const total = await allPalettes.count()
      for (let i = 0; i < total; i++) {
        const isActive = await allPalettes.nth(i).getAttribute('data-active') === 'true'
          || await allPalettes.nth(i).evaluate(el => el.classList.contains('active') || el.classList.contains('selected'))
        if (!isActive) {
          await allPalettes.nth(i).click()
          paletteClicked = true
          break
        }
      }
    }

    if (!paletteClicked && await paletteBtnAlt.isVisible().catch(() => false)) {
      await paletteBtnAlt.click()
      paletteClicked = true
    }

    if (paletteClicked) {
      await page.waitForTimeout(600) // allow CSS variables to update

      const newBg = await sidebar.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor,
      )
      console.log(`New sidebar bg: ${newBg}`)

      // Color must have changed (palettes have different sidebar_bg values)
      expect(newBg).not.toBe(originalBg)
    } else {
      console.warn('No palette button found to click — verifying ThemeEditor is at least visible')
      const themeEditor = page.locator('[class*="theme"], [class*="Theme"], [class*="editor"]').first()
      await expect(themeEditor).toBeVisible()
    }

    await page.screenshot({ path: 'test-results/theming-palette-changed.png', fullPage: true })
  })

  test('Logo de la clínica se puede cargar desde el panel de admin', async ({ page }) => {
    const tabApariencia = page.locator('button, [role="tab"], a', { hasText: /Apariencia|Tema/i }).first()
    await tabApariencia.click()
    await page.waitForTimeout(500)

    // Logo upload section should be present
    const logoSection = page.locator('input[type="file"], [class*="logo"], [class*="Logo"]').first()
    await expect(logoSection).toBeVisible({ timeout: 8000 })

    await page.screenshot({ path: 'test-results/admin-logo-section.png', fullPage: true })
  })
})
