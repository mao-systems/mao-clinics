import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id:                   string
  first_name:           string
  last_name:            string
  email:                string
  role:                 'admin' | 'receptionist'
  active:               boolean
  last_login_at:        string | null
  must_change_password: boolean
}

export interface CreateUserData {
  first_name: string
  last_name:  string
  email:      string
  role:       'admin' | 'receptionist'
}

export interface UpdateUserData {
  first_name?: string
  last_name?:  string
  role?:       'admin' | 'receptionist'
  active?:     boolean
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn:  () => api.get<{ users: AdminUser[] }>('/admin/users').then(d => d.users),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: (data: CreateUserData) =>
      api.post<{ user: AdminUser }>('/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Usuario creado. Se envió email con credenciales.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      api.put<{ user: AdminUser }>(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Usuario actualizado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useResetUserPassword() {
  const toast = useToast()

  return useMutation({
    mutationFn: (userId: string) =>
      api.post<{ message: string }>(`/admin/users/${userId}/reset-password`, {}),
    onSuccess: () => {
      toast.success('Contraseña restablecida. Se envió email al usuario.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
