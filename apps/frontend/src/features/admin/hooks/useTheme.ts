import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useTenant } from '@/hooks/useTenant'
import { useToast } from '@/hooks/useToast'
import type { ThemeConfig } from '@/hooks/useAuth'

function injectCssVars(theme: ThemeConfig) {
  const root = document.documentElement
  root.style.setProperty('--color-primary', theme.primary)
  root.style.setProperty('--color-primary-light', theme.primary_light)
  root.style.setProperty('--color-primary-dark', theme.primary_dark)
  root.style.setProperty('--color-secondary', theme.secondary)
  root.style.setProperty('--color-secondary-light', theme.secondary_light)
  root.style.setProperty('--color-surface', theme.surface)
  root.style.setProperty('--color-sidebar-bg', theme.sidebar_bg)
  root.style.setProperty('--color-sidebar-text', theme.sidebar_text)
  root.style.setProperty('--border-radius-base', theme.border_radius)
}

interface SaveThemeResponse {
  tenant: unknown
  message: string
}

export function useTheme() {
  const { theme: savedTheme } = useTenant()
  const [localTheme, setLocalTheme] = useState<ThemeConfig | null>(savedTheme)
  const [isDirty, setIsDirty] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  // Sync local theme when saved theme loads initially or after reset
  useEffect(() => {
    if (savedTheme && !isDirty) {
      setLocalTheme(savedTheme)
    }
  }, [savedTheme, isDirty])

  function previewTheme(theme: ThemeConfig) {
    setLocalTheme(theme)
    injectCssVars(theme)
    setIsDirty(true)
  }

  function resetTheme() {
    if (!savedTheme) return
    setLocalTheme(savedTheme)
    injectCssVars(savedTheme)
    setIsDirty(false)
  }

  const saveTheme = useMutation({
    mutationFn: (theme: ThemeConfig) =>
      api.put<SaveThemeResponse>('/admin/theme', { theme }),
    onSuccess: () => {
      // Invalidate the auth cache so useTenant picks up the persisted theme
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setIsDirty(false)
      toast.success('Tema guardado correctamente')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Error al guardar el tema')
    },
  })

  return {
    localTheme,
    isDirty,
    previewTheme,
    saveTheme,
    resetTheme,
    isSaving: saveTheme.isPending,
  }
}
