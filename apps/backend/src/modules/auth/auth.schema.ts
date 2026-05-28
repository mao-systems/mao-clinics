import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Used only as a body fallback when the cookie is not available (e.g. testing)
export const RefreshSchema = z.object({
  refreshToken: z.string(),
})
