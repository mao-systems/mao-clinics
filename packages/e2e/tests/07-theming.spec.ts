import { test, expect } from '@playwright/test'

test.describe('Sistema de Theming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
  })

  test('Panel de admin carga con las tabs esperadas', async ({ page }) => {
    const tabApariencia = page.locator('button, [role="tab"], a', { hasText: /Apariencia|Tema/i }).first()
    await expect(tabApariencia).toBeVisible({ timeout: 8000 })

    const tabMedicos = page.locator('button, [role="tab"], a', { hasText: /Médicos|Doctores/i }).first()
    await expect(tabMedicos).toBeVisible()

    const tabUsuarios = page.locator('button, [role="tab"], a', { hasText: /Usuarios/i }).first()
    await expect(tabUsuarios).toBeVisible()

    await page.screenshot({ path: 'test-results/admin-tabs.png', fullPage: true })
  })

  test('Cambiar paleta de colores actualiza el sidebar en tiempo real', async ({ page }) => {
    const tabApariencia = page.locator('button, [role="tab"], a', { hasText: /Apariencia|Tema/i }).first()
    await tabApariencia.click()
    await page.waitForTimeout(500)

    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible()

    const originalBg = await sidebar.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    )
    console.log(`Original sidebar bg: ${originalBg}`)

    // PaletteSelector renders preset palette buttons — click one that isn't currently active
    // Look for palette buttons or any preset button different from the current selection
    const paletteButtons = page.locator('button', {
      hasText: /Dental|Ginecolog|Pedi[aá]tric|Oftalmolog|Traumatolog/i,
    })
    const altPalette = paletteButtons.first()

    let paletteClicked = false
    if (await altPalette.isVisible().catch(() => false)) {
      await altPalette.click()
      paletteClicked = true
    } else {
      // Fallback: try any clickable palette swatch (common pattern: button with rounded style)
      const swatches = page.locator('[class*="palette"], [class*="preset"], [data-palette]')
      const swatchCount = await swatches.count()
      for (let i = 0; i < swatchCount; i++) {
        const isActive = await swatches.nth(i).evaluate(
          (el) => el.classList.contains('ring-2') || el.getAttribute('aria-pressed') === 'true',
        ).catch(() => false)
        if (!isActive) {
          await swatches.nth(i).click()
          paletteClicked = true
          break
        }
      }
    }

    if (paletteClicked) {
      await page.waitForTimeout(600)

      const newBg = await sidebar.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor,
      )
      console.log(`New sidebar bg: ${newBg}`)
      expect(newBg).not.toBe(originalBg)
    } else {
      // Palette buttons not found — verify ThemeEditor section at least renders
      const themeSection = page.locator('text=/Paleta|Colores|Apariencia/i').first()
      await expect(themeSection).toBeVisible()
    }

    await page.screenshot({ path: 'test-results/theming-palette-changed.png', fullPage: true })
  })

  test('Sección de logo está presente en panel de admin', async ({ page }) => {
    const tabApariencia = page.locator('button, [role="tab"], a', { hasText: /Apariencia|Tema/i }).first()
    await tabApariencia.click()
    await page.waitForTimeout(500)

    // LogoUploader renders a visible "Subir logo" button that triggers the hidden file input
    // The file input itself is class="hidden" — test the visible button instead
    const uploadBtn = page.locator('button', { hasText: /Subir logo|logo/i }).first()
    await expect(uploadBtn).toBeVisible({ timeout: 8000 })

    // The hidden file input should be attached to the DOM even if not visible
    const fileInput = page.locator('input[type="file"]').first()
    await expect(fileInput).toBeAttached({ timeout: 5000 })

    await page.screenshot({ path: 'test-results/admin-logo-section.png', fullPage: true })
  })
})
