import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ServiceItem {
  id:          string
  tenant_id:   string
  name:        string
  description: string | null
  price:       string        // Decimal serialized as string e.g. "50.00"
  category:    string | null
  active:      boolean
  sort_order:  number
  created_at:  string
  updated_at:  string
}

export interface CreateServiceData {
  name:         string
  description?: string | null
  price:        string
  category?:    string | null
  active:       boolean
  sort_order:   number
}

export interface UpdateServiceData {
  name?:        string
  description?: string | null
  price?:       string
  category?:    string | null
  active?:      boolean
  sort_order?:  number
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAdminServices() {
  return useQuery({
    queryKey: ['admin', 'services'],
    queryFn:  () => api.get<{ services: ServiceItem[] }>('/admin/services').then(d => d.services),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: (data: CreateServiceData) =>
      api.post<{ service: ServiceItem }>('/admin/services', data),
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
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceData }) =>
      api.put<{ service: ServiceItem }>(`/admin/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] })
      toast.success('Servicio actualizado')
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
