import { z } from 'zod'

export const CreatePatientSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, 'DNI must be exactly 8 digits'),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  date_of_birth: z.string().datetime().optional().nullable(),
  sex: z.enum(['M', 'F', 'Other']).optional().nullable(),
  phone: z
    .string()
    .regex(/^9\d{8}$/, 'Phone must be 9 digits starting with 9')
    .optional()
    .nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  allergies: z.string().max(500).optional().nullable(),
  medical_history: z.string().max(2000).optional().nullable(),
  blood_type: z.preprocess(
    (v) => (v === '' ? null : v),
    z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).optional().nullable(),
  ),
  emergency_contact_name: z.string().max(100).optional().nullable(),
  emergency_contact_phone: z
    .string()
    .regex(/^9\d{8}$/)
    .optional()
    .nullable(),
})

export const UpdatePatientSchema = CreatePatientSchema.partial()

export const PatientQuerySchema = z.object({
  q: z.string().optional(),
  district: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export type CreatePatientData = z.infer<typeof CreatePatientSchema>
export type UpdatePatientData = z.infer<typeof UpdatePatientSchema>
export type PatientQuery = z.infer<typeof PatientQuerySchema>
