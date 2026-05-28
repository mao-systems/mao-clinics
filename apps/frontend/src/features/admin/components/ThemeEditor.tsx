import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import type { ThemeConfig } from '@/hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { PaletteSelector } from './PaletteSelector'
import { ColorPicker } from './ColorPicker'
import { ThemePreview } from './ThemePreview'
import { LogoUploader } from './LogoUploader'

type BorderRadius = '4px' | '6px' | '8px' | '10px' | '12px' | '16px'

const BORDER_RADIUS_OPTIONS: { value: BorderRadius; label: string }[] = [
  { value: '4px', label: '4px — Cuadrado' },
  { value: '6px', label: '6px — Ligeramente redondeado' },
  { value: '8px', label: '8px — Redondeado (recomendado)' },
  { value: '10px', label: '10px — Más redondeado' },
  { value: '12px', label: '12px — Muy redondeado' },
  { value: '16px', label: '16px — Completamente redondeado' },
]

export function ThemeEditor() {
  const { localTheme, isDirty, previewTheme, saveTheme, resetTheme, isSaving } = useTheme()
  const { user } = useAuth()
  const { logoUrl } = useTenant()

  if (!localTheme) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="md" />
      </div>
    )
  }

  const tenantName = user?.tenant?.name ?? 'Mi Clínica'

  function updateTheme(partial: Partial<ThemeConfig>) {
    previewTheme({ ...localTheme!, ...partial })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Left column — 3/5 */}
      <div className="lg:col-span-3 space-y-5">
        {/* Palette selector */}
        <Card title="Elige una paleta">
          <PaletteSelector currentTheme={localTheme} onSelect={previewTheme} />
        </Card>

        {/* Custom color pickers */}
        <Card title="Personalizar colores">
          <div className="space-y-7">
            {/* Primary colors */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Colores principales
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <ColorPicker
                  label="Color principal"
                  value={localTheme.primary}
                  description="Botones, encabezados y elementos activos"
                  onChange={(c) => updateTheme({ primary: c })}
                />
                <ColorPicker
                  label="Color principal claro"
                  value={localTheme.primary_light}
                  description="Fondos y destacados suaves"
                  onChange={(c) => updateTheme({ primary_light: c })}
                />
                <ColorPicker
                  label="Color principal oscuro"
                  value={localTheme.primary_dark}
                  description="Hover y estados presionados"
                  onChange={(c) => updateTheme({ primary_dark: c })}
                />
                <ColorPicker
                  label="Color secundario"
                  value={localTheme.secondary}
                  description="Botones de acción secundaria"
                  onChange={(c) => updateTheme({ secondary: c })}
                />
                <ColorPicker
                  label="Color secundario claro"
                  value={localTheme.secondary_light}
                  description="Fondos secundarios suaves"
                  onChange={(c) => updateTheme({ secondary_light: c })}
                />
                <ColorPicker
                  label="Color de superficie"
                  value={localTheme.surface}
                  description="Fondo de páginas y tarjetas"
                  onChange={(c) => updateTheme({ surface: c })}
                />
              </div>
            </div>

            {/* Sidebar colors */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Barra lateral
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <ColorPicker
                  label="Fondo de barra lateral"
                  value={localTheme.sidebar_bg}
                  onChange={(c) => updateTheme({ sidebar_bg: c })}
                />
                <ColorPicker
                  label="Texto de barra lateral"
                  value={localTheme.sidebar_text}
                  onChange={(c) => updateTheme({ sidebar_text: c })}
                />
              </div>
            </div>

            {/* Border radius */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Bordes
              </h4>
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Radio de bordes
                </label>
                <select
                  value={localTheme.border_radius}
                  onChange={(e) =>
                    updateTheme({ border_radius: e.target.value as BorderRadius })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {BORDER_RADIUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Logo uploader */}
        <Card title="Logo de la clínica">
          <LogoUploader currentLogoUrl={logoUrl} tenantName={tenantName} />
        </Card>
      </div>

      {/* Right column — 2/5, sticky */}
      <div className="lg:col-span-2">
        <div className="sticky top-6 space-y-4">
          {/* Preview card */}
          <Card title="Vista previa">
            <ThemePreview theme={localTheme} tenantName={tenantName} />
          </Card>

          {/* Save / reset actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
            {isDirty && (
              <div className="flex items-center gap-2 text-amber-600 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                Tienes cambios sin guardar
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!isDirty || isSaving}
                onClick={resetTheme}
                className="flex-1"
              >
                Restablecer
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!isDirty}
                isLoading={isSaving}
                onClick={() => saveTheme.mutate(localTheme)}
                className="flex-1"
              >
                Guardar tema
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
