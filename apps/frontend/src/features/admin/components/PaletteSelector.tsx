import { PRESET_PALETTES } from '../constants/palettes'
import type { ThemeConfig } from '@/hooks/useAuth'

interface PaletteSelectorProps {
  currentTheme: ThemeConfig
  onSelect: (theme: ThemeConfig) => void
}

const SWATCH_KEYS: (keyof ThemeConfig)[] = [
  'primary',
  'secondary',
  'primary_light',
  'surface',
  'sidebar_bg',
]

function isPaletteActive(current: ThemeConfig, palettePrimary: string, paletteSidebar: string) {
  return current.primary === palettePrimary && current.sidebar_bg === paletteSidebar
}

export function PaletteSelector({ currentTheme, onSelect }: PaletteSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {PRESET_PALETTES.map((palette) => {
        const isActive = isPaletteActive(
          currentTheme,
          palette.theme.primary,
          palette.theme.sidebar_bg,
        )

        return (
          <button
            key={palette.id}
            type="button"
            onClick={() => onSelect(palette.theme)}
            className={[
              'text-left rounded-lg border-2 overflow-hidden transition-all focus:outline-none',
              isActive
                ? 'border-primary ring-2 ring-primary ring-offset-2'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
            ].join(' ')}
          >
            {/* Color swatches bar */}
            <div className="flex h-9">
              {SWATCH_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex-1"
                  style={{ backgroundColor: palette.theme[key] as string }}
                />
              ))}
            </div>

            {/* Name and description */}
            <div className="p-2.5 bg-white">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{palette.name}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{palette.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
