import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

// ── Shared types ──────────────────────────────────────────────────────────────

export interface AppointmentPatient {
  id: string
  first_name: string
  last_name: string
  dni: string
}

export interface AppointmentDoctor {
  id: string
  specialty: string
  consultation_duration?: number
  user: { first_name: string; last_name: string }
}

export interface AppointmentWithRelations {
  id: string
  tenant_id: string
  patient_id: string
  doctor_id: string
  scheduled_at: string   // UTC ISO string
  duration_min: number
  status: string
  reason: string | null
  notes: string | null
  reminder_sent: boolean
  cancelled_reason: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  patient: AppointmentPatient
  doctor: AppointmentDoctor
}

export interface DoctorSummary {
  id: string
  specialty: string
  consultation_duration: number
  active: boolean
  user: { first_name: string; last_name: string }
}

export interface AvailabilitySlot {
  time: string          // Lima local time "08:00"
  scheduled_at: string  // UTC ISO string
  available: boolean
}

export interface CreateAppointmentInput {
  patient_id:   string
  doctor_id:    string
  scheduled_at: string
  duration_min: number
  reason?:      string | null
  notes?:       string | null
}

// ── Calendar appointments ─────────────────────────────────────────────────────

export function useCalendarAppointments(
  from: Date,
  to: Date,
  doctorId?: string,
) {
  return useQuery({
    queryKey: ['appointments', 'calendar', from.toISOString(), to.toISOString(), doctorId],
    queryFn: () =>
      api.get<AppointmentWithRelations[]>('/appointments', {
        params: {
          from:      from.toISOString(),
          to:        to.toISOString(),
          doctor_id: doctorId,
          limit:     200,
        },
      }),
    staleTime: 1000 * 60 * 2,  // 2 min — calendar data refreshes frequently
    enabled: !!(from && to),
  })
}

// ── Availability slots ────────────────────────────────────────────────────────

export function useAvailability(
  doctorId: string,
  date: string,
  durationMin: number,
) {
  return useQuery({
    queryKey: ['appointments', 'availability', doctorId, date, durationMin],
    queryFn: () =>
      api.get<AvailabilitySlot[]>('/appointments/availability', {
        params: {
          doctor_id:    doctorId,
          date,
          duration_min: durationMin,
        },
      }),
    enabled:   !!doctorId && !!date,
    staleTime: 1000 * 30,  // 30 sec — slots change quickly
  })
}

// ── Doctors list ──────────────────────────────────────────────────────────────

export function useDoctors() {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const data = await api.get<{ doctors: DoctorSummary[] }>('/admin/doctors')
      return data.doctors
    },
    staleTime: 1000 * 60 * 10,  // 10 min — doctors list rarely changes
  })
}

// ── Create ────────────────────────────────────────────────────────────────────

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (data: CreateAppointmentInput) =>
      api.post<{ appointment: AppointmentWithRelations }>('/appointments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'calendar'] })
      toast.success('Cita registrada correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ── Update status ─────────────────────────────────────────────────────────────

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({
      id,
      status,
      cancelledReason,
    }: {
      id: string
      status: string
      cancelledReason?: string
    }) =>
      api.patch<{ appointment: AppointmentWithRelations }>(
        `/appointments/${id}/status`,
        { status, cancelled_reason: cancelledReason },
      ),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'calendar'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', id] })
      const label = data.appointment?.status ?? 'actualizado'
      toast.success(`Estado actualizado correctamente`)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ── Update appointment ────────────────────────────────────────────────────────

export function useUpdateAppointment() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<CreateAppointmentInput>
    }) =>
      api.put<{ appointment: AppointmentWithRelations }>(`/appointments/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'calendar'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', id] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
