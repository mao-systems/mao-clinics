import { useEffect, useState } from 'react'
import { useAuth, type ThemeConfig } from '@/hooks/useAuth'

export function useTenant() {
  const { user } = useAuth()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const themeConfig = user?.tenant?.theme_config ?? null

  useEffect(() => {
    if (!themeConfig) return

    const root = document.documentElement

    // Inject tenant palette as CSS variables consumed by Tailwind and raw CSS
    root.style.setProperty('--color-primary', themeConfig.primary)
    root.style.setProperty('--color-primary-light', themeConfig.primary_light)
    root.style.setProperty('--color-primary-dark', themeConfig.primary_dark)
    root.style.setProperty('--color-secondary', themeConfig.secondary)
    root.style.setProperty('--color-secondary-light', themeConfig.secondary_light)
    root.style.setProperty('--color-surface', themeConfig.surface)
    root.style.setProperty('--color-sidebar-bg', themeConfig.sidebar_bg)
    root.style.setProperty('--color-sidebar-text', themeConfig.sidebar_text)
    root.style.setProperty('--border-radius-base', themeConfig.border_radius)

    setLogoUrl(themeConfig.logo_url)
  }, [themeConfig])

  return {
    theme: themeConfig as ThemeConfig | null,
    logoUrl,
    tenantName: user?.tenant?.name ?? null,
  }
}
