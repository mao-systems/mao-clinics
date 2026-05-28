import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import type { Patient } from '@mao-systems/shared'

export interface PatientFilters {
  q?: string
  district?: string
  page?: number
  limit?: number
}

export interface AppointmentWithDetails {
  id: string
  scheduled_at: string
  duration_min: number
  status: string
  reason: string | null
  notes: string | null
  doctor: {
    id: string
    specialty: string
    user: { first_name: string; last_name: string }
  }
  consultation: {
    id: string
    chief_complaint: string
    diagnosis: string | null
    icd10_code: string | null
    icd10_description: string | null
    prescriptions: Array<{
      id: string
      instructions: string | null
      issued_at: string
      items: Array<{ id: string; medication: string; dosage: string; frequency: string }>
    }>
  } | null
}

export interface InvoiceWithItems {
  id: string
  type: string
  series: string
  number: number
  total: string
  currency: string
  issued_at: string
  consultation_id: string | null
  items: Array<{ id: string; description: string; quantity: number; unit_price: string; total: string }>
}

export interface PatientHistory {
  patient: Patient
  appointments: AppointmentWithDetails[]
  invoices: InvoiceWithItems[]
}

export function usePatients(filters: PatientFilters = {}) {
  // Strip undefined values so they don't appear as "undefined" in query params
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, unknown>

  return useQuery({
    queryKey: ['patients', filters],
    queryFn: () => api.getList<Patient>('/patients', params),
    placeholderData: keepPreviousData,
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: async () => {
      const res = await api.get<{ patient: Patient }>(`/patients/${id}`)
      return res.patient
    },
    enabled: !!id,
  })
}

export function usePatientHistory(id: string) {
  return useQuery({
    queryKey: ['patients', id, 'history'],
    queryFn: () => api.get<PatientHistory>(`/patients/${id}/history`),
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (data: Partial<Patient>) => api.post<{ patient: Patient }>('/patients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Paciente registrado correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdatePatient() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Patient> }) =>
      api.put<{ patient: Patient }>(`/patients/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['patients', id] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Paciente actualizado correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeletePatient() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/patients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Paciente eliminado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
