import { z } from 'zod'

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #1A5F9E)')

export const ThemeConfigSchema = z.object({
  primary: hexColor,
  primary_light: hexColor,
  primary_dark: hexColor,
  secondary: hexColor,
  secondary_light: hexColor,
  surface: hexColor,
  sidebar_bg: hexColor,
  sidebar_text: hexColor,
  border_radius: z.enum(['4px', '6px', '8px', '10px', '12px', '16px']),
  logo_url: z.string().url().nullable(),
})

export const UpdateThemeSchema = z.object({
  theme: ThemeConfigSchema,
})

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>
