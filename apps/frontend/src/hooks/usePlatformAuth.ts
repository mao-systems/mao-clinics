import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { platformApi } from '@/lib/platformApi'

export interface PlatformAdmin {
  id: string
  email: string
  fullName: string
  lastLoginAt: string | null
  createdAt: string
}

const PLATFORM_AUTH_KEY = ['platform-auth', 'me'] as const

export function usePlatformAuth() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: admin, isLoading } = useQuery<PlatformAdmin>({
    queryKey: PLATFORM_AUTH_KEY,
    queryFn: () =>
      platformApi.get<{ admin: PlatformAdmin }>('/auth/me').then((d) => d.admin),
    staleTime: Infinity,
    retry: false,
  })

  async function logout() {
    await platformApi.post('/auth/logout').catch(() => {})
    queryClient.clear()
    navigate('/platform/login')
  }

  return {
    admin: admin ?? null,
    isLoading,
    isAuthenticated: !!admin,
    logout,
  }
}

export function usePlatformLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      platformApi.post<{ admin: PlatformAdmin }>('/auth/login', { email, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLATFORM_AUTH_KEY })
      navigate('/platform/dashboard')
    },
  })
}
