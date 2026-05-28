import { z } from 'zod'

export const CreateConsultationSchema = z.object({
  appointment_id:    z.string().uuid(),
  chief_complaint:   z.string().min(1).max(1000),
  physical_exam:     z.string().max(2000).optional(),
  diagnosis:         z.string().max(1000).optional(),
  icd10_code:        z.string().max(10).optional(),
  icd10_description: z.string().max(200).optional(),
  treatment:         z.string().max(2000).optional(),
  notes:             z.string().max(2000).optional(),
  follow_up_date:    z.string().datetime().optional(),
})

export const UpdateConsultationSchema = CreateConsultationSchema
  .omit({ appointment_id: true })
  .partial()

export const PrescriptionItemSchema = z.object({
  medication:    z.string().min(1).max(200),
  dosage:        z.string().min(1).max(100),
  frequency:     z.string().min(1).max(100),
  duration_days: z.number().int().positive(),
  notes:         z.string().max(500).optional(),
})

export const CreatePrescriptionSchema = z.object({
  instructions: z.string().max(1000).optional(),
  items:        z.array(PrescriptionItemSchema).min(1),
})

export const RecordsQuerySchema = z.object({
  patient_id:     z.string().uuid().optional(),
  doctor_id:      z.string().uuid().optional(),
  appointment_id: z.string().uuid().optional(),
  from:           z.string().optional(),
  to:             z.string().optional(),
  page:           z.coerce.number().int().positive().default(1),
  limit:          z.coerce.number().int().positive().max(100).default(20),
})

export type CreateConsultationData  = z.infer<typeof CreateConsultationSchema>
export type UpdateConsultationData  = z.infer<typeof UpdateConsultationSchema>
export type CreatePrescriptionData  = z.infer<typeof CreatePrescriptionSchema>
export type RecordsQuery            = z.infer<typeof RecordsQuerySchema>
