import { z } from 'zod'

export const UpdateFeaturesSchema = z.object({
  features: z.record(z.string(), z.boolean()),
})

export const CreateTenantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  ruc: z.string().regex(/^\d{11}$/, 'RUC must be exactly 11 digits'),
  subdomain: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Subdomain must be lowercase alphanumeric with hyphens only'),
  plan: z.string().default('starter'),
  plan_price_soles: z.number().min(0).default(0),
  adminEmail: z.string().email('Invalid admin email'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  theme_config: z.record(z.string(), z.unknown()).optional(),
})
