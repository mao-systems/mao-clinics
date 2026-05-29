import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DaySchedule {
  day_of_week: number   // 0 = Sunday … 6 = Saturday
  start_time:  string   // "08:00"
  end_time:    string   // "18:00"
  active:      boolean
}

export interface DoctorUser {
  first_name:           string
  last_name:            string
  email:                string
  must_change_password: boolean
}

export interface DoctorWithRelations {
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
  user:      DoctorUser
  schedules: DaySchedule[]
  _count?:   { appointments: number }
}

export interface CreateDoctorData {
  first_name:            string
  last_name:             string
  email:                 string
  specialty:             string
  cmp?:                  string | null
  bio?:                  string | null
  consultation_duration: number
  schedule:              DaySchedule[]
}

export interface UpdateDoctorData {
  first_name?:            string
  last_name?:             string
  specialty?:             string
  cmp?:                   string | null
  bio?:                   string | null
  consultation_duration?: number
  schedule?:              DaySchedule[]
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAdminDoctors() {
  return useQuery({
    queryKey: ['admin', 'doctors'],
    queryFn:  () => api.get<{ doctors: DoctorWithRelations[] }>('/admin/doctors').then(d => d.doctors),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateDoctor() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: (data: CreateDoctorData) =>
      api.post<{ doctor: DoctorWithRelations }>('/admin/doctors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] })
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Médico registrado. Se envió email con credenciales.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDoctorData }) =>
      api.put<{ doctor: DoctorWithRelations }>(`/admin/doctors/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] })
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Médico actualizado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useToggleDoctorActive() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<{ doctor: DoctorWithRelations }>(`/admin/doctors/${id}/active`, { active }),
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] })
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success(active ? 'Médico activado' : 'Médico desactivado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
