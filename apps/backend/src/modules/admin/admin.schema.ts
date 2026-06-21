import { z } from 'zod'

// ── Theme ─────────────────────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #1A5F9E)')

export const ThemeConfigSchema = z.object({
  primary:       hexColor,
  primary_light: hexColor,
  primary_dark:  hexColor,
  secondary:     hexColor,
  secondary_light: hexColor,
  surface:       hexColor,
  sidebar_bg:    hexColor,
  sidebar_text:  hexColor,
  border_radius: z.enum(['4px', '6px', '8px', '10px', '12px', '16px']),
  logo_url:      z.string().url().nullable(),
})

export const UpdateThemeSchema = z.object({
  theme: ThemeConfigSchema,
})

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>

// ── Doctor schedule entry ─────────────────────────────────────────────────────

const ScheduleEntrySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time:  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:MM'),
  end_time:    z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:MM'),
  active:      z.boolean().default(true),
})

// ── Doctors ───────────────────────────────────────────────────────────────────

export const CreateDoctorSchema = z.object({
  first_name:            z.string().min(1).max(100),
  last_name:             z.string().min(1).max(100),
  email:                 z.string().email(),
  specialty:             z.string().min(1).max(100),
  cmp:                   z.string().max(20).optional().nullable(),
  bio:                   z.string().max(500).optional().nullable(),
  consultation_duration: z.number().int().min(10).max(120).default(30),
  schedule:              z.array(ScheduleEntrySchema).optional().default([]),
})

// email cannot be changed here — use user management for that
export const UpdateDoctorSchema = CreateDoctorSchema
  .omit({ email: true })
  .partial()

export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>
export type UpdateDoctorInput = z.infer<typeof UpdateDoctorSchema>

// ── Non-doctor user accounts ──────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name:  z.string().min(1).max(100),
  email:      z.string().email(),
  // role 'doctor' is only created via createDoctor, not here
  role:       z.enum(['admin', 'receptionist']),
})

export const UpdateUserSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name:  z.string().min(1).max(100).optional(),
  role:       z.enum(['admin', 'receptionist']).optional(),
  active:     z.boolean().optional(),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

// ── Service catalog ───────────────────────────────────────────────────────────

export const CreateServiceSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  price:       z.string().regex(/^\d+(\.\d{1,2})?$/, 'El precio debe ser un decimal válido'),
  category:    z.string().max(100).optional().nullable(),
  active:      z.boolean().default(true),
  sort_order:  z.number().int().default(0),
})

export const UpdateServiceSchema = CreateServiceSchema.partial()

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>

// ── Specialty catalog ─────────────────────────────────────────────────────────

export const CreateSpecialtySchema = z.object({
  name:       z.string().min(1).max(100),
  active:     z.boolean().default(true),
  sort_order: z.number().int().default(0),
})

export const UpdateSpecialtySchema = CreateSpecialtySchema.partial()

export type CreateSpecialtyInput = z.infer<typeof CreateSpecialtySchema>
export type UpdateSpecialtyInput = z.infer<typeof UpdateSpecialtySchema>

// ── Password management ───────────────────────────────────────────────────────

export const ChangePasswordSchema = z
  .object({
    current_password: z.string().min(1),
    new_password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirm_password: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.new_password !== data.confirm_password) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: 'Las contraseñas no coinciden',
        path:    ['confirm_password'],
      })
    }
  })

export const ResetUserPasswordSchema = z.object({
  user_id: z.string().uuid(),
})

export type ChangePasswordInput    = z.infer<typeof ChangePasswordSchema>
export type ResetUserPasswordInput = z.infer<typeof ResetUserPasswordSchema>
