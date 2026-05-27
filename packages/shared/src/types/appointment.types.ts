export enum AppointmentStatus {
  pending = 'pending',
  confirmed = 'confirmed',
  in_progress = 'in_progress',
  completed = 'completed',
  cancelled = 'cancelled',
  no_show = 'no_show',
}

export interface Appointment {
  id: string
  tenant_id: string
  patient_id: string
  doctor_id: string
  scheduled_at: Date
  duration_minutes: number
  status: AppointmentStatus
  reason: string | null
  notes: string | null
  reminder_sent: boolean
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}
