import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiInstance } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

// ── Shared types ──────────────────────────────────────────────────────────────

export interface Attachment {
  name:       string
  url:        string
  size:       number
  uploadedAt: string
}

export interface PrescriptionItem {
  id:            string
  medication:    string
  dosage:        string
  frequency:     string
  duration_days: number
  notes:         string | null
}

export interface Prescription {
  id:              string
  consultation_id: string
  tenant_id:       string
  instructions:    string | null
  issued_at:       string
  items:           PrescriptionItem[]
}

export interface ConsultationPatient {
  id:         string
  first_name: string
  last_name:  string
  dni:        string
}

export interface ConsultationDoctor {
  id:        string
  specialty: string
  user:      { first_name: string; last_name: string }
}

export interface ConsultationAppointment {
  id:           string
  scheduled_at: string
  status:       string
  patient:      ConsultationPatient
  doctor:       ConsultationDoctor
}

export interface Consultation {
  id:                string
  tenant_id:         string
  appointment_id:    string
  chief_complaint:   string
  physical_exam:     string | null
  diagnosis:         string | null
  icd10_code:        string | null
  icd10_description: string | null
  treatment:         string | null
  notes:             string | null
  follow_up_date:    string | null
  attachments:       Attachment[]
  created_at:        string
  updated_at:        string
  appointment:       ConsultationAppointment
  prescriptions:     Prescription[]
}

export interface RecordFilters {
  patient_id?:     string
  doctor_id?:      string
  appointment_id?: string
  from?:           string
  to?:             string
  page?:           number
  limit?:          number
}

export interface CreateConsultationInput {
  appointment_id:    string
  chief_complaint:   string
  physical_exam?:    string
  diagnosis?:        string
  icd10_code?:       string
  icd10_description?: string
  treatment?:        string
  notes?:            string
  follow_up_date?:   string
}

export interface UpdateConsultationInput {
  chief_complaint?:   string
  physical_exam?:     string
  diagnosis?:         string
  icd10_code?:        string
  icd10_description?: string
  treatment?:         string
  notes?:             string
  follow_up_date?:    string
  silent?:            boolean  // suppress the success toast (used for auto-save)
}

export interface CreatePrescriptionInput {
  instructions?: string
  items: Array<{
    medication:    string
    dosage:        string
    frequency:     string
    duration_days: number
    notes?:        string
  }>
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useRecords(filters: RecordFilters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, unknown>

  return useQuery({
    queryKey: ['records', filters],
    queryFn:  () => api.getList<Consultation>('/records', params),
  })
}

export function useRecord(id: string) {
  return useQuery({
    queryKey: ['records', id],
    queryFn:  async () => {
      const res = await api.get<{ consultation: Consultation }>(`/records/${id}`)
      return res.consultation
    },
    enabled:  !!id,
  })
}

export function useRecordByAppointment(appointmentId: string) {
  return useQuery({
    queryKey: ['records', 'appointment', appointmentId],
    queryFn:  async () => {
      const res = await api.getList<Consultation>('/records', {
        appointment_id: appointmentId,
        limit:          1,
      })
      return res.data[0] ?? null
    },
    enabled: !!appointmentId,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateRecord() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: (data: CreateConsultationInput) =>
      api.post<{ consultation: Consultation }>('/records', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', 'calendar'] })
      toast.success('Consulta iniciada')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateRecord() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConsultationInput }) => {
      // Strip the internal silent flag before sending to the API
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { silent: _silent, ...payload } = data
      return api.put<{ consultation: Consultation }>(`/records/${id}`, payload)
    },
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ['records', id] })
      if (!data.silent) {
        toast.success('Consulta guardada')
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreatePrescription() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({
      recordId,
      data,
    }: {
      recordId: string
      data:     CreatePrescriptionInput
    }) => api.post<{ prescription: Prescription }>(`/records/${recordId}/prescriptions`, data),
    onSuccess: (_, { recordId }) => {
      queryClient.invalidateQueries({ queryKey: ['records', recordId] })
      queryClient.invalidateQueries({ queryKey: ['records', 'appointment'] })
      toast.success('Receta creada correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCompleteRecord() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ consultation: Consultation }>(`/records/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', 'calendar'] })
      toast.success('Consulta completada correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUploadAttachment() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({ recordId, file }: { recordId: string; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.postForm<{ consultation: Consultation }>(
        `/records/${recordId}/attachments`,
        formData,
      )
    },
    onSuccess: (_, { recordId }) => {
      queryClient.invalidateQueries({ queryKey: ['records', recordId] })
      queryClient.invalidateQueries({ queryKey: ['records', 'appointment'] })
      toast.success('Archivo adjuntado correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ── PDF download (plain function, not a hook) ─────────────────────────────────

export async function downloadPrescriptionPdf(
  recordId:       string,
  prescriptionId: string,
): Promise<void> {
  const response = await apiInstance.get(
    `/records/${recordId}/prescriptions/${prescriptionId}/pdf`,
    { responseType: 'blob' },
  )

  const url = URL.createObjectURL(
    new Blob([response.data as BlobPart], { type: 'application/pdf' }),
  )
  const a = document.createElement('a')
  a.href     = url
  a.download = `receta-${prescriptionId.slice(0, 8)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
