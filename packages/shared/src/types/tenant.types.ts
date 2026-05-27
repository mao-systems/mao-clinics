export interface ThemeConfig {
  primary: string
  primary_light: string
  primary_dark: string
  secondary: string
  secondary_light: string
  surface: string
  sidebar_bg: string
  sidebar_text: string
  border_radius: string
  logo_url: string | null
}

export interface Tenant {
  id: string
  name: string
  slug: string
  theme_config: ThemeConfig
  created_at: Date
  updated_at: Date
}
