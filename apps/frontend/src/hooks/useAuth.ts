import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'

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

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'doctor' | 'receptionist'
  tenant: {
    id: string
    name: string
    subdomain: string
    plan: string
    theme_config: ThemeConfig
  }
  doctor?: {
    id: string
    specialty: string
  } | null
}

const AUTH_QUERY_KEY = ['auth', 'me'] as const

export function useAuth() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const data = await api.get<{ user: AuthUser }>('/auth/me')
      return data.user
    },
    staleTime: Infinity, // user data never goes stale — invalidated explicitly on login/logout
    retry: false,        // a 401 means not authenticated, no point retrying
  })

  async function logout() {
    await api.post('/auth/logout').catch(() => {
      // Even if the server call fails, clear client state and redirect
    })
    queryClient.clear()
    navigate('/login')
  }

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    logout,
  }
}

export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.post<{ user: AuthUser }>('/auth/login', { email, password }),
    onSuccess: () => {
      // Force a fresh fetch of the user so all consumers see the authenticated state
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
      navigate('/dashboard')
    },
  })
}
