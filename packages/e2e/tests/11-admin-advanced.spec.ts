import { test, expect } from '@playwright/test'

test.describe('Panel de Administración — avanzado', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
  })

  test('Tab de Médicos muestra lista con al menos un doctor del seed', async ({ page }) => {
    // Admin tabs are hash-based: navigate directly to /admin#medicos
    await page.goto('/admin#medicos')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // DoctorsTab renders DoctorCard components in a grid.
    // Each card has: <p class="text-sm font-semibold text-gray-800 truncate">Dr. {name}</p>
    const doctorNameEls = page.locator('p.font-semibold').filter({ hasText: /^Dr\./ })
    await expect(doctorNameEls.first()).toBeVisible({ timeout: 10000 })
    const count = await doctorNameEls.count()
    expect(count).toBeGreaterThan(0)

    await page.screenshot({ path: 'test-results/admin-doctors-list.png', fullPage: true })
  })

  test('Lista de médicos muestra campos de nombre y especialidad', async ({ page }) => {
    // Navigate directly via hash to avoid relying on tab click selector
    await page.goto('/admin#medicos')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Doctor name: <p class="text-sm font-semibold ...">Dr. FullName</p>
    const doctorNameEls = page.locator('p.font-semibold').filter({ hasText: /^Dr\./ })
    await expect(doctorNameEls.first()).toBeVisible({ timeout: 10000 })

    // Specialty: <p class="text-xs text-gray-500 mt-0.5">{specialty}</p> inside each DoctorCard
    const specialtyEls = page.locator('p.text-xs.text-gray-500')
    await expect(specialtyEls.first()).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'test-results/admin-doctors-fields.png', fullPage: true })
  })

  test('Tab de Usuarios muestra lista de usuarios con sus roles', async ({ page }) => {
    const tabUsuarios = page.locator('button, [role="tab"], a', {
      hasText: /Usuarios/i,
    }).first()
    await expect(tabUsuarios).toBeVisible({ timeout: 8000 })
    await tabUsuarios.click()
    await page.waitForTimeout(500)
    await page.waitForLoadState('networkidle')

    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })

    // Role column should show "admin", "doctor", or "receptionist"
    const tableText = await page.locator('tbody').innerText()
    const hasRole = /admin|doctor|receptionist|recepcionista/i.test(tableText)
    expect(hasRole).toBe(true)

    await page.screenshot({ path: 'test-results/admin-users-list.png', fullPage: true })
  })

  test('Formulario de nuevo médico se abre desde el tab de Médicos', async ({ page }) => {
    const tabMedicos = page.locator('button, [role="tab"], a', {
      hasText: /Médicos|Doctores/i,
    }).first()
    await tabMedicos.click()
    await page.waitForTimeout(500)
    await page.waitForLoadState('networkidle')

    const newBtn = page.locator('button', {
      hasText: /Nuevo médico|Agregar médico|Nuevo doctor|Agregar/i,
    }).first()
    await expect(newBtn).toBeVisible({ timeout: 8000 })
    await newBtn.click()
    await page.waitForTimeout(400)

    const modal = page.locator('.fixed.inset-0.z-50 .shadow-xl').first()
    await expect(modal).toBeVisible({ timeout: 6000 })

    const modalText = await modal.innerText()
    const hasFormFields = /nombre|especialidad|colegiatura|email/i.test(modalText)
    expect(hasFormFields).toBe(true)

    await page.screenshot({ path: 'test-results/admin-new-doctor-form.png', fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('Configuración de la clínica muestra nombre e información del tenant', async ({ page }) => {
    // Look for a "Clínica" or "Configuración" tab
    const tabClinica = page.locator('button, [role="tab"], a', {
      hasText: /Cl[ií]nica|Configuraci[oó]n|General/i,
    }).first()
    const hasTab = await tabClinica.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasTab) {
      await tabClinica.click()
      await page.waitForTimeout(500)
      await page.waitForLoadState('networkidle')
    }

    const bodyText = await page.locator('body').innerText()
    // Admin panel should show the clinic name or a settings form
    const hasClinicInfo = /san rafael|cl[ií]nica|nombre|configuraci[oó]n/i.test(bodyText)
    expect(hasClinicInfo).toBe(true)

    await page.screenshot({ path: 'test-results/admin-clinic-config.png', fullPage: true })
  })

  test('Guardar cambios de apariencia no produce errores en la consola', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    const tabApariencia = page.locator('button, [role="tab"], a', {
      hasText: /Apariencia|Tema/i,
    }).first()
    await tabApariencia.click()
    await page.waitForTimeout(500)

    // Click a non-default palette to trigger a change
    const palette = page.locator('button', {
      hasText: /Azul y Naranja|Morado Elegante|Naranja Pedi[aá]trico/i,
    }).first()
    if (await palette.isVisible({ timeout: 3000 }).catch(() => false)) {
      await palette.click()
      await page.waitForTimeout(400)
    }

    // Click save if button exists
    const saveBtn = page.locator('button', {
      hasText: /Guardar|Aplicar|Guardar cambios/i,
    }).first()
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click()
      await page.waitForTimeout(1000)
      await page.waitForLoadState('networkidle')
    }

    // No unhandled JS errors should appear
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('Warning') && !e.includes('DevTools')
    )
    expect(criticalErrors.length).toBe(0)

    await page.screenshot({ path: 'test-results/admin-save-theme.png', fullPage: true })
  })
})
