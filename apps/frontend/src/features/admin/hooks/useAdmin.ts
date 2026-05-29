import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScheduleEntry {
  day_of_week: number
  start_time:  string
  end_time:    string
  active:      boolean
}

export interface AdminDoctor {
  id:                    string
  tenant_id:             string
  user_id:               string
  specialty:             string
  cmp:                   string | null
  bio:                   string | null
  consultation_duration: number
  active:                boolean
  created_at:            string
  updated_at:            string
  user: {
    first_name:          string
    last_name:           string
    email:               string
    must_change_password: boolean
  }
  schedules: ScheduleEntry[]
  _count?: { appointments: number }
}

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

export interface ServiceCatalogItem {
  id:          string
  tenant_id:   string
  name:        string
  description: string | null
  price:       string
  category:    string | null
  active:      boolean
  sort_order:  number
  created_at:  string
  updated_at:  string
}

export interface CreateDoctorPayload {
  first_name:            string
  last_name:             string
  email:                 string
  specialty:             string
  cmp?:                  string | null
  bio?:                  string | null
  consultation_duration: number
  schedule:              ScheduleEntry[]
}

export interface UpdateDoctorPayload {
  first_name?:            string
  last_name?:             string
  specialty?:             string
  cmp?:                   string | null
  bio?:                   string | null
  consultation_duration?: number
  schedule?:              ScheduleEntry[]
}

export interface CreateUserPayload {
  first_name: string
  last_name:  string
  email:      string
  role:       'admin' | 'receptionist'
}

export interface UpdateUserPayload {
  first_name?: string
  last_name?:  string
  role?:       'admin' | 'receptionist'
  active?:     boolean
}

export interface CreateServicePayload {
  name:        string
  description?: string | null
  price:        string
  category?:   string | null
  active:      boolean
  sort_order:  number
}

export interface UpdateServicePayload {
  name?:        string
  description?: string | null
  price?:       string
  category?:   string | null
  active?:     boolean
  sort_order?: number
}

export interface ChangePasswordPayload {
  current_password: string
  new_password:     string
  confirm_password: string
}

// ── Doctors ───────────────────────────────────────────────────────────────────

export function useAdminDoctors() {
  return useQuery({
    queryKey: ['admin', 'doctors'],
    queryFn:  () => api.get<{ doctors: AdminDoctor[] }>('/admin/doctors').then(d => d.doctors),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateDoctor() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: (data: CreateDoctorPayload) =>
      api.post<{ doctor: AdminDoctor }>('/admin/doctors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] })
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Doctor creado correctamente. Se envió un correo con las credenciales.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDoctorPayload }) =>
      api.put<{ doctor: AdminDoctor }>(`/admin/doctors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] })
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Doctor actualizado correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useToggleDoctorActive() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<{ doctor: AdminDoctor }>(`/admin/doctors/${id}/active`, { active }),
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] })
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success(active ? 'Doctor activado' : 'Doctor desactivado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ── Users ─────────────────────────────────────────────────────────────────────

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
    mutationFn: (data: CreateUserPayload) =>
      api.post<{ user: AdminUser }>('/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Usuario creado. Se envió un correo con las credenciales.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) =>
      api.put<{ user: AdminUser }>(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Usuario actualizado correctamente')
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
      toast.success('Contraseña restablecida. Se envió un correo al usuario.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ── Services ──────────────────────────────────────────────────────────────────

export function useAdminServices() {
  return useQuery({
    queryKey: ['admin', 'services'],
    queryFn:  () => api.get<{ services: ServiceCatalogItem[] }>('/admin/services').then(d => d.services),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: (data: CreateServicePayload) =>
      api.post<{ service: ServiceCatalogItem }>('/admin/services', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] })
      toast.success('Servicio creado correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServicePayload }) =>
      api.put<{ service: ServiceCatalogItem }>(`/admin/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] })
      toast.success('Servicio actualizado correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/admin/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] })
      toast.success('Servicio eliminado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ── Password ──────────────────────────────────────────────────────────────────

export function useChangePassword() {
  const toast = useToast()

  return useMutation({
    mutationFn: (data: ChangePasswordPayload) =>
      api.post<{ message: string }>('/admin/change-password', data),
    onSuccess: () => {
      toast.success('Contraseña actualizada correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
