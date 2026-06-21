import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpecialtyItem {
  id:         string
  tenant_id:  string
  name:       string
  active:     boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateSpecialtyData {
  name:       string
  active:     boolean
  sort_order: number
}

export interface UpdateSpecialtyData {
  name?:       string
  active?:     boolean
  sort_order?: number
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAdminSpecialties() {
  return useQuery({
    queryKey: ['admin', 'specialties'],
    queryFn:  () => api.get<{ specialties: SpecialtyItem[] }>('/admin/specialties').then(d => d.specialties),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateSpecialty() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: (data: CreateSpecialtyData) =>
      api.post<{ specialty: SpecialtyItem }>('/admin/specialties', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'specialties'] })
      toast.success('Especialidad creada correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateSpecialty() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSpecialtyData }) =>
      api.put<{ specialty: SpecialtyItem }>(`/admin/specialties/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'specialties'] })
      toast.success('Especialidad actualizada')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteSpecialty() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/admin/specialties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'specialties'] })
      toast.success('Especialidad eliminada')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
