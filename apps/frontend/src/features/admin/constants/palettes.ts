import type { ThemeConfig } from '@/hooks/useAuth'

export interface Palette {
  id: string
  name: string
  description: string
  theme: ThemeConfig
}

export const PRESET_PALETTES: Palette[] = [
  {
    id: 'blue-professional',
    name: 'Azul Profesional',
    description: 'Confianza y seriedad',
    theme: {
      primary: '#1A5F9E',
      primary_light: '#E6F1FB',
      primary_dark: '#0C3F6B',
      secondary: '#2EAA6E',
      secondary_light: '#E8F5EE',
      surface: '#F7FAFB',
      sidebar_bg: '#1A2740',
      sidebar_text: '#FFFFFF',
      border_radius: '8px',
      logo_url: null,
    },
  },
  {
    id: 'blue-orange',
    name: 'Azul y Naranja',
    description: 'Moderno y energético',
    theme: {
      primary: '#0088CC',
      primary_light: '#E0F5FF',
      primary_dark: '#005A88',
      secondary: '#FF6B35',
      secondary_light: '#FFF0EB',
      surface: '#FAFCFF',
      sidebar_bg: '#004E75',
      sidebar_text: '#FFFFFF',
      border_radius: '10px',
      logo_url: null,
    },
  },
  {
    id: 'purple-elegant',
    name: 'Morado Elegante',
    description: 'Sofisticado y cálido',
    theme: {
      primary: '#9B4D96',
      primary_light: '#F5EBF8',
      primary_dark: '#6B2E68',
      secondary: '#E8729A',
      secondary_light: '#FDEEF4',
      surface: '#FDF8FF',
      sidebar_bg: '#5C2D6B',
      sidebar_text: '#FFFFFF',
      border_radius: '12px',
      logo_url: null,
    },
  },
  {
    id: 'amber-green',
    name: 'Ámbar y Verde',
    description: 'Alegre y accesible',
    theme: {
      primary: '#F5A623',
      primary_light: '#FFF5E0',
      primary_dark: '#C47D0E',
      secondary: '#3DB8A0',
      secondary_light: '#E0F7F3',
      surface: '#FFFDF7',
      sidebar_bg: '#1A4A42',
      sidebar_text: '#FFFFFF',
      border_radius: '12px',
      logo_url: null,
    },
  },
  {
    id: 'navy-cyan',
    name: 'Marino y Cyan',
    description: 'Preciso y tecnológico',
    theme: {
      primary: '#1C3557',
      primary_light: '#E8EDF5',
      primary_dark: '#0F1E31',
      secondary: '#00B4D8',
      secondary_light: '#E0F8FF',
      surface: '#F5F7FA',
      sidebar_bg: '#0F1E31',
      sidebar_text: '#FFFFFF',
      border_radius: '6px',
      logo_url: null,
    },
  },
  {
    id: 'dark-red',
    name: 'Azul Oscuro y Rojo',
    description: 'Serio y con impacto',
    theme: {
      primary: '#2C4A6E',
      primary_light: '#E5EBF2',
      primary_dark: '#18283D',
      secondary: '#E84855',
      secondary_light: '#FDEAEA',
      surface: '#F6F7F9',
      sidebar_bg: '#18283D',
      sidebar_text: '#FFFFFF',
      border_radius: '8px',
      logo_url: null,
    },
  },
]
