import { z } from 'zod'

const APPOINTMENT_STATUSES = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const

export const CreateAppointmentSchema = z.object({
  patient_id:   z.string().uuid(),
  doctor_id:    z.string().uuid(),
  scheduled_at: z.string().datetime(),   // ISO 8601 UTC string from frontend
  duration_min: z.number().int().min(10).max(120).default(30),
  reason:       z.string().max(500).optional().nullable(),
  notes:        z.string().max(1000).optional().nullable(),
})

export const UpdateAppointmentSchema = CreateAppointmentSchema.partial()

export const UpdateStatusSchema = z.object({
  status:           z.enum(APPOINTMENT_STATUSES),
  cancelled_reason: z.string().max(500).optional(),
})

export const AppointmentQuerySchema = z.object({
  from:       z.string().datetime().optional(),
  to:         z.string().datetime().optional(),
  doctor_id:  z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
  status:     z.enum(APPOINTMENT_STATUSES).optional(),
  page:       z.coerce.number().min(1).default(1),
  limit:      z.coerce.number().min(1).max(200).default(50),
})

export const AvailabilityQuerySchema = z.object({
  doctor_id:    z.string().uuid(),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  duration_min: z.coerce.number().int().min(10).max(120).default(30),
})

export type CreateAppointmentData  = z.infer<typeof CreateAppointmentSchema>
export type UpdateAppointmentData  = z.infer<typeof UpdateAppointmentSchema>
export type UpdateStatusData       = z.infer<typeof UpdateStatusSchema>
export type AppointmentQuery       = z.infer<typeof AppointmentQuerySchema>
export type AvailabilityQuery      = z.infer<typeof AvailabilityQuerySchema>
