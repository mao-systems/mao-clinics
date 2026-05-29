export interface AvailabilitySlot {
  time:         string   // Lima local "HH:mm"
  scheduled_at: string   // UTC ISO string
  available:    boolean
}

export interface AvailabilityResponse {
  available: boolean
  message?:  string          // Set when available=false (e.g. "El médico no atiende los domingos")
  slots:     AvailabilitySlot[]
}

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
