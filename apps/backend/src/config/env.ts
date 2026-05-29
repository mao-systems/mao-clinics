import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'

// .env lives at the monorepo root (two levels up from apps/backend)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  BACKEND_URL:  z.string().url().default('http://localhost:3001'),
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  BILLING_PROVIDER: z.enum(['mock', 'nubefact']).default('mock'),
  WHATSAPP_PROVIDER: z.enum(['mock', 'meta']).default('mock'),
  // Optional S3 config
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  // Optional Nubefact config
  NUBEFACT_TOKEN: z.string().optional(),
  NUBEFACT_RUC: z.string().optional(),
  // Optional Meta WhatsApp config
  META_WHATSAPP_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  // Optional SMTP config — used for welcome emails and password resets
  SMTP_HOST:   z.string().optional(),
  SMTP_PORT:   z.string().default('587'),
  SMTP_SECURE: z.string().optional(),  // 'true' to use TLS on SMTP_PORT
  SMTP_USER:   z.string().optional(),
  SMTP_PASS:   z.string().optional(),
  SMTP_FROM:   z.string().optional(),  // e.g. "MAO Clinics <no-reply@maosystems.io>"
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
