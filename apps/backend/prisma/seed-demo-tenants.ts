/**
 * Multi-tenant showcase seed — creates 4 additional demo tenants plus confirms
 * Clínica San Rafael (tenant 1) has all feature flags enabled.
 *
 * Run with: pnpm seed:demo-tenants
 *
 * IMPORTANT:
 *  - This script is idempotent (upsert on subdomain / email — safe to run again).
 *  - It does NOT call reset-demo.ts and does NOT wipe existing data.
 *  - reset-demo.ts only affects Clínica San Rafael and NEVER touches these tenants.
 *  - Logos are written as SVG files to uploads/logos/ and referenced via BACKEND_URL.
 */

import fs from 'fs'
import path from 'path'
import { PrismaClient, UserRole, AppointmentStatus, InvoiceType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

// ─── Helpers (same as seed.ts) ────────────────────────────────────────────────
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
function atHour(date: Date, h: number, m: number): Date {
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d
}

// ─── Reference data (same as seed.ts) ────────────────────────────────────────
const MALE_NAMES = ['Carlos', 'Juan', 'Luis', 'Jorge', 'Miguel', 'Roberto', 'César', 'Fernando', 'Manuel', 'Alejandro'] as const
const FEMALE_NAMES = ['María', 'Carmen', 'Rosa', 'Ana', 'Patricia', 'Lucía', 'Sandra', 'Gloria', 'Elena', 'Mónica'] as const
const LAST_NAMES = [
  'García', 'Quispe', 'Mamani', 'Torres', 'López', 'Flores', 'Huanca', 'Condori',
  'Rivera', 'Chávez', 'Morales', 'Vega', 'Cruz', 'Rojas', 'Mendoza', 'Castillo',
  'Vargas', 'Gutiérrez', 'Ramos', 'Sánchez', 'Paredes', 'Villanueva', 'Herrera', 'Díaz',
] as const
const DISTRICTS = ['Miraflores', 'San Borja', 'San Isidro', 'Surco', 'La Molina', 'Magdalena', 'Pueblo Libre', 'Jesús María'] as const
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const
const ALLERGIES = [
  'Alergia a la penicilina',
  'Alergia a los AINEs (ibuprofeno, aspirina)',
  'Alergia al látex',
  'Rinitis alérgica estacional',
] as const
const ICD10 = [
  { code: 'J06.9', description: 'Infección aguda de las vías respiratorias superiores' },
  { code: 'K21.0', description: 'Enfermedad por reflujo gastroesofágico con esofagitis' },
  { code: 'M54.5', description: 'Dolor en la región lumbar' },
  { code: 'I10',   description: 'Hipertensión esencial (primaria)' },
  { code: 'K29.7', description: 'Gastritis no especificada' },
  { code: 'N39.0', description: 'Infección de vías urinarias, sitio no especificado' },
] as const
const REASONS = ['Control mensual', 'Dolor de cabeza', 'Fiebre', 'Revisión de exámenes', 'Malestar general', 'Seguimiento de tratamiento'] as const
const COMPLAINTS = [
  'Paciente refiere dolor de cabeza persistente desde hace 3 días',
  'Tos y secreción nasal abundante desde hace 5 días',
  'Dolor abdominal en epigastrio postprandial de moderada intensidad',
  'Acude para control rutinario de presión arterial',
  'Fiebre de 38.5°C y malestar general desde el día de ayer',
  'Ardor y dolor al orinar desde hace 2 días, sin fiebre asociada',
] as const
const TREATMENTS = [
  'Reposo relativo por 3 días. Hidratación abundante. Dieta blanda.',
  'Antibioticoterapia y analgésico según indicación. Control en 7 días.',
  'Dieta hiposódica e hipograsa. Actividad física moderada. Control en 30 días.',
  'Paracetamol 500mg cada 6 horas si fiebre supera 38.5°C.',
  'Hidratación oral abundante. Antibioticoterapia por 7 días.',
] as const
const MEDICATIONS = [
  { medication: 'Amoxicilina 500mg',  dosage: '500mg',        frequency: 'Cada 8 horas',             duration_days: 7  },
  { medication: 'Paracetamol 500mg',  dosage: '500mg',        frequency: 'Cada 6 horas si hay dolor', duration_days: 5  },
  { medication: 'Ibuprofeno 400mg',   dosage: '400mg',        frequency: 'Cada 8 horas con alimentos', duration_days: 5  },
  { medication: 'Omeprazol 20mg',     dosage: '20mg',         frequency: 'Una vez al día en ayunas',  duration_days: 30 },
  { medication: 'Loratadina 10mg',    dosage: '10mg',         frequency: 'Una vez al día',             duration_days: 10 },
] as const
const BUSINESS_HOURS = [8, 9, 10, 11, 14, 15, 16, 17] as const

// ─── Logo helpers ─────────────────────────────────────────────────────────────
function ensureLogosDir(): string {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'logos')
  fs.mkdirSync(uploadsDir, { recursive: true })
  return uploadsDir
}

function writeLogo(filename: string, svgContent: string): string {
  const logosDir = ensureLogosDir()
  fs.writeFileSync(path.join(logosDir, filename), svgContent, 'utf8')
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001'
  return `${backendUrl}/uploads/logos/${filename}`
}

function makeLogoSvg(tenantName: string, primaryColor: string, textColor = '#FFFFFF'): string {
  // Circle with initials + name wordmark — clean and professional for demo purposes
  const initials = tenantName
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
    .substring(0, 2)

  // Clamp text to fit within 220px width (SVG viewBox 260×60)
  const displayName = tenantName.length > 22 ? tenantName.substring(0, 21) + '…' : tenantName

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 60" width="260" height="60">
  <circle cx="30" cy="30" r="26" fill="${primaryColor}"/>
  <text x="30" y="36" font-family="Arial, sans-serif" font-size="14" font-weight="bold"
        fill="${textColor}" text-anchor="middle">${initials}</text>
  <text x="64" y="26" font-family="Arial, sans-serif" font-size="11" font-weight="600"
        fill="#1F2937">${displayName}</text>
  <text x="64" y="43" font-family="Arial, sans-serif" font-size="9"
        fill="#6B7280">Sistema de gestión médica</text>
</svg>`
}

// ─── DNI generator (unique per call within a Set) ─────────────────────────────
function generateDni(used: Set<string>): string {
  let dni: string
  do { dni = String(randInt(10000000, 99999999)) } while (used.has(dni))
  used.add(dni)
  return dni
}

// ─── Appointment builder factory ──────────────────────────────────────────────
type ApptRow = {
  id: string; tenant_id: string; patient_id: string; doctor_id: string
  scheduled_at: Date; duration_min: number; status: AppointmentStatus; reason: string
}

function makeApptBuilder(tenantId: string, today: Date, patientIds: string[], doctorIds: string[]) {
  const appointmentsData: ApptRow[] = []
  const completedApptIds: string[] = []

  function buildAppt(daysOffset: number, status: AppointmentStatus): string {
    const id = uuidv4()
    const doctorId = pick(doctorIds)
    appointmentsData.push({
      id, tenant_id: tenantId,
      patient_id: pick(patientIds),
      doctor_id: doctorId,
      scheduled_at: atHour(addDays(today, daysOffset), pick(BUSINESS_HOURS), pick([0, 15, 30])),
      duration_min: 30,
      status,
      reason: pick(REASONS),
    })
    if (status === AppointmentStatus.completed) completedApptIds.push(id)
    return id
  }

  return { appointmentsData, completedApptIds, buildAppt }
}

// ─── Consultation / prescription builder ─────────────────────────────────────
type ConsultRow = {
  id: string; tenant_id: string; appointment_id: string
  chief_complaint: string; diagnosis: string
  icd10_code: string; icd10_description: string
  treatment: string; follow_up_date: Date | null
}

function buildConsultations(tenantId: string, completedApptIds: string[], appts: ApptRow[]): ConsultRow[] {
  return completedApptIds.map((apptId) => {
    const icd = pick(ICD10)
    const appt = appts.find((a) => a.id === apptId)!
    return {
      id: uuidv4(), tenant_id: tenantId, appointment_id: apptId,
      chief_complaint: pick(COMPLAINTS),
      diagnosis: `${icd.description}. Cuadro leve a moderado.`,
      icd10_code: icd.code, icd10_description: icd.description,
      treatment: pick(TREATMENTS),
      follow_up_date: Math.random() < 0.35 ? addDays(appt.scheduled_at, randInt(7, 30)) : null,
    }
  })
}

// ─── Invoice builder ──────────────────────────────────────────────────────────
type InvoiceWithItems = {
  id: string; tenant_id: string; patient_id: string; consultation_id: string
  type: InvoiceType; series: string; number: number
  subtotal: number; tax: number; total: number; currency: string
  sunat_status: string; issued_at: Date
  items: { description: string; unitPrice: number }[]
}

function buildInvoices(tenantId: string, consultations: ConsultRow[], appts: ApptRow[]): InvoiceWithItems[] {
  let boletaSeq = 1; let facturaSeq = 1
  return consultations
    .filter(() => Math.random() < 0.4)
    .map((c) => {
      const appt = appts.find((a) => a.id === c.appointment_id)!
      const isBoleta = Math.random() < 0.8
      const items = [{ description: 'Consulta médica', unitPrice: randInt(80, 150) }]
      const subtotal = items.reduce((s, i) => s + i.unitPrice, 0)
      const tax = Math.round(subtotal * 0.18 * 100) / 100
      return {
        id: uuidv4(), tenant_id: tenantId,
        patient_id: appt.patient_id, consultation_id: c.id,
        type: isBoleta ? InvoiceType.boleta : InvoiceType.factura,
        series: isBoleta ? 'B001' : 'F001',
        number: isBoleta ? boletaSeq++ : facturaSeq++,
        subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100,
        currency: 'PEN', sunat_status: 'mock', issued_at: appt.scheduled_at,
        items,
      }
    })
}

// ═════════════════════════════════════════════════════════════════════════════
// TENANT SEEDERS
// ═════════════════════════════════════════════════════════════════════════════

// ─── Tenant 1: Confirm Clínica San Rafael has all flags ───────────────────────
async function seedTenant1() {
  console.log('  [1/5] Confirming Clínica San Rafael feature flags…')
  const sanRafael = await prisma.tenant.findUnique({ where: { subdomain: 'sanrafael' } })
  if (!sanRafael) {
    console.log('       ⚠️  Clínica San Rafael not found — run pnpm db:seed first')
    return
  }
  await prisma.tenant.update({
    where: { subdomain: 'sanrafael' },
    data: {
      plan: 'clinica',
      plan_price_soles: 350,
      features: {
        whatsapp_reminders: true,
        hce: true,
        billing: true,
        dashboard_kpis: true,
        custom_theme: true,
      },
    },
  })
  console.log('       ✓ Features confirmed (all ON) — existing data untouched')
}

// ─── Tenant 2: Policlínico Vida Plena ────────────────────────────────────────
async function seedTenant2(passwordHash: string, today: Date) {
  console.log('  [2/5] Seeding Policlínico Vida Plena…')

  // Dental palette: cyan / orange / dark navy
  const theme = {
    primary: '#0088CC', primary_light: '#E0F4FF', primary_dark: '#005B87',
    secondary: '#FF6B35', secondary_light: '#FFF0EA',
    surface: '#F7FBFF', sidebar_bg: '#004E75', sidebar_text: '#FFFFFF',
    border_radius: '8px', logo_url: null as string | null,
  }
  const logoUrl = writeLogo('vidaplena.svg', makeLogoSvg('Policlínico Vida Plena', '#0088CC'))
  theme.logo_url = logoUrl

  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'vidaplena' },
    update: { plan_price_soles: 230, features: { whatsapp_reminders: true, hce: true, billing: false, dashboard_kpis: true, custom_theme: true }, theme_config: theme },
    create: {
      name: 'Policlínico Vida Plena', ruc: '20234567890', subdomain: 'vidaplena',
      plan: 'profesional', plan_price_soles: 230,
      theme_config: theme,
      features: { whatsapp_reminders: true, hce: true, billing: false, dashboard_kpis: true, custom_theme: true },
    },
  })

  const adminUser = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'admin@vidaplena.maosystems.io' } },
    update: {},
    create: {
      tenant_id: tenant.id, email: 'admin@vidaplena.maosystems.io',
      password_hash: passwordHash, first_name: 'Valeria', last_name: 'Huanca Ríos', role: UserRole.admin,
    },
  })

  const doc1User = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'doctor@vidaplena.maosystems.io' } },
    update: {},
    create: {
      tenant_id: tenant.id, email: 'doctor@vidaplena.maosystems.io',
      password_hash: passwordHash, first_name: 'Marcos', last_name: 'Salcedo Vega', role: UserRole.doctor,
    },
  })
  const doc2User = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'doctor2@vidaplena.maosystems.io' } },
    update: {},
    create: {
      tenant_id: tenant.id, email: 'doctor2@vidaplena.maosystems.io',
      password_hash: passwordHash, first_name: 'Sofía', last_name: 'Paredes Chávez', role: UserRole.doctor,
    },
  })

  const [doctor1, doctor2] = await Promise.all([
    prisma.doctor.upsert({
      where: { user_id: doc1User.id },
      update: {},
      create: { tenant_id: tenant.id, user_id: doc1User.id, specialty: 'Medicina General', cmp: '61234', consultation_duration: 25 },
    }),
    prisma.doctor.upsert({
      where: { user_id: doc2User.id },
      update: {},
      create: { tenant_id: tenant.id, user_id: doc2User.id, specialty: 'Cardiología', cmp: '72345', consultation_duration: 30 },
    }),
  ])
  void adminUser // used for side effect (upsert creates admin account)

  // Doctor schedules
  for (const [doctorId, days] of [
    [doctor1.id, [1, 2, 3, 4, 5]],
    [doctor2.id, [1, 3, 5]],
  ] as [string, number[]][]) {
    for (const day of days) {
      await prisma.doctorSchedule.upsert({
        where: { doctor_id_day_of_week: { doctor_id: doctorId, day_of_week: day } },
        update: {},
        create: { tenant_id: tenant.id, doctor_id: doctorId, day_of_week: day, start_time: '08:00', end_time: '17:00' },
      })
    }
  }

  // Patients (15)
  const usedDnis = new Set<string>()
  const patientIds: string[] = []
  for (let i = 0; i < 15; i++) {
    const isMale = Math.random() < 0.5
    const patient = await prisma.patient.upsert({
      where: { tenant_id_dni: { tenant_id: tenant.id, dni: generateDni(usedDnis) } },
      update: {},
      create: {
        id: uuidv4(), tenant_id: tenant.id,
        first_name: pick(isMale ? MALE_NAMES : FEMALE_NAMES),
        last_name: `${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`,
        dni: [...usedDnis][usedDnis.size - 1],
        phone: `9${String(randInt(10000000, 99999999))}`,
        sex: isMale ? 'M' : 'F',
        date_of_birth: new Date(randInt(1960, 2005), randInt(0, 11), randInt(1, 28)),
        blood_type: pick(BLOOD_TYPES), district: pick(DISTRICTS),
        allergies: Math.random() < 0.25 ? pick(ALLERGIES) : null,
      },
    })
    patientIds.push(patient.id)
  }

  // Appointments (18): 3 today, 4 tomorrow, rest over next 10 days
  const { appointmentsData, completedApptIds, buildAppt } = makeApptBuilder(tenant.id, today, patientIds, [doctor1.id, doctor2.id])
  for (let i = 0; i < 5; i++) buildAppt(-randInt(3, 20), AppointmentStatus.completed)
  for (let i = 0; i < 3; i++) buildAppt(0, AppointmentStatus.confirmed)
  for (let i = 0; i < 4; i++) buildAppt(1, AppointmentStatus.confirmed)
  for (let i = 0; i < 6; i++) buildAppt(randInt(2, 10), AppointmentStatus.pending)

  await prisma.appointment.createMany({ data: appointmentsData, skipDuplicates: true })

  // Consultations (from completed) — no invoices (billing flag OFF)
  const consultations = buildConsultations(tenant.id, completedApptIds, appointmentsData)
  await prisma.consultation.createMany({ data: consultations, skipDuplicates: true })

  console.log(`       ✓ ${patientIds.length} patients · ${appointmentsData.length} appts · ${consultations.length} consultations · 0 invoices`)
}

// ─── Tenant 3: Consultorio Dr. Mendoza ───────────────────────────────────────
async function seedTenant3(passwordHash: string, today: Date) {
  console.log('  [3/5] Seeding Consultorio Dr. Mendoza…')

  // No custom_theme → use system default palette (neutral gray-blue)
  const theme = {
    primary: '#4A5568', primary_light: '#EDF2F7', primary_dark: '#2D3748',
    secondary: '#68D391', secondary_light: '#F0FFF4',
    surface: '#F7FAFC', sidebar_bg: '#2D3748', sidebar_text: '#FFFFFF',
    border_radius: '6px', logo_url: null,
  }

  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'drmendoza' },
    update: { plan_price_soles: 100, features: { whatsapp_reminders: false, hce: false, billing: false, dashboard_kpis: false, custom_theme: false } },
    create: {
      name: 'Consultorio Dr. Mendoza', ruc: '10345678901', subdomain: 'drmendoza',
      plan: 'starter', plan_price_soles: 100,
      theme_config: theme,
      features: { whatsapp_reminders: false, hce: false, billing: false, dashboard_kpis: false, custom_theme: false },
    },
  })

  // Admin IS the doctor — single-person consultorio
  const adminUser = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'admin@drmendoza.maosystems.io' } },
    update: {},
    create: {
      tenant_id: tenant.id, email: 'admin@drmendoza.maosystems.io',
      password_hash: passwordHash, first_name: 'Eduardo', last_name: 'Mendoza Paredes', role: UserRole.admin,
    },
  })

  const doctor = await prisma.doctor.upsert({
    where: { user_id: adminUser.id },
    update: {},
    create: { tenant_id: tenant.id, user_id: adminUser.id, specialty: 'Medicina General', cmp: '83456', consultation_duration: 30 },
  })

  for (const day of [1, 2, 3, 4, 5]) {
    await prisma.doctorSchedule.upsert({
      where: { doctor_id_day_of_week: { doctor_id: doctor.id, day_of_week: day } },
      update: {},
      create: { tenant_id: tenant.id, doctor_id: doctor.id, day_of_week: day, start_time: '09:00', end_time: '13:00' },
    })
  }

  // Patients (8)
  const usedDnis = new Set<string>()
  const patientIds: string[] = []
  for (let i = 0; i < 8; i++) {
    const isMale = Math.random() < 0.5
    const patient = await prisma.patient.upsert({
      where: { tenant_id_dni: { tenant_id: tenant.id, dni: generateDni(usedDnis) } },
      update: {},
      create: {
        id: uuidv4(), tenant_id: tenant.id,
        first_name: pick(isMale ? MALE_NAMES : FEMALE_NAMES),
        last_name: `${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`,
        dni: [...usedDnis][usedDnis.size - 1],
        phone: `9${String(randInt(10000000, 99999999))}`,
        sex: isMale ? 'M' : 'F',
        date_of_birth: new Date(randInt(1955, 2000), randInt(0, 11), randInt(1, 28)),
        blood_type: pick(BLOOD_TYPES), district: pick(DISTRICTS),
      },
    })
    patientIds.push(patient.id)
  }

  // Appointments (10): 1 today, 2 tomorrow, rest within 7 days
  const { appointmentsData, completedApptIds, buildAppt } = makeApptBuilder(tenant.id, today, patientIds, [doctor.id])
  for (let i = 0; i < 3; i++) buildAppt(-randInt(2, 14), AppointmentStatus.completed)
  buildAppt(0, AppointmentStatus.confirmed)
  for (let i = 0; i < 2; i++) buildAppt(1, AppointmentStatus.pending)
  for (let i = 0; i < 4; i++) buildAppt(randInt(2, 7), AppointmentStatus.pending)

  await prisma.appointment.createMany({ data: appointmentsData, skipDuplicates: true })

  // 6 basic consultations — no prescriptions needed (hce flag OFF means simplified display)
  const consultations = buildConsultations(tenant.id, completedApptIds, appointmentsData)
  await prisma.consultation.createMany({ data: consultations, skipDuplicates: true })

  console.log(`       ✓ ${patientIds.length} patients · ${appointmentsData.length} appts · ${consultations.length} consultations · 0 invoices`)
}

// ─── Tenant 4: Centro Médico Bienestar ────────────────────────────────────────
async function seedTenant4(passwordHash: string, today: Date) {
  console.log('  [4/5] Seeding Centro Médico Bienestar…')

  // Pediatrics palette: warm orange / teal / dark teal sidebar
  const theme = {
    primary: '#F5A623', primary_light: '#FFF8EC', primary_dark: '#C17D0E',
    secondary: '#3DB8A0', secondary_light: '#E8F8F5',
    surface: '#FFFCF7', sidebar_bg: '#1A4A42', sidebar_text: '#FFFFFF',
    border_radius: '10px', logo_url: null as string | null,
  }
  const logoUrl = writeLogo('bienestar.svg', makeLogoSvg('Centro Médico Bienestar', '#F5A623', '#1A4A42'))
  theme.logo_url = logoUrl

  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'bienestar' },
    update: { plan_price_soles: 230, features: { whatsapp_reminders: true, hce: true, billing: false, dashboard_kpis: true, custom_theme: true }, theme_config: theme },
    create: {
      name: 'Centro Médico Bienestar', ruc: '20456789012', subdomain: 'bienestar',
      plan: 'profesional', plan_price_soles: 230,
      theme_config: theme,
      features: { whatsapp_reminders: true, hce: true, billing: false, dashboard_kpis: true, custom_theme: true },
    },
  })

  // 3 users: admin, doctor, receptionist
  const [adminUser, doc1User, doc2User, doc3User, receptionUser] = await Promise.all([
    prisma.user.upsert({
      where: { tenant_id_email: { tenant_id: tenant.id, email: 'admin@bienestar.maosystems.io' } },
      update: {},
      create: { tenant_id: tenant.id, email: 'admin@bienestar.maosystems.io', password_hash: passwordHash, first_name: 'Beatriz', last_name: 'Sánchez Torres', role: UserRole.admin },
    }),
    prisma.user.upsert({
      where: { tenant_id_email: { tenant_id: tenant.id, email: 'doctor1@bienestar.maosystems.io' } },
      update: {},
      create: { tenant_id: tenant.id, email: 'doctor1@bienestar.maosystems.io', password_hash: passwordHash, first_name: 'Diego', last_name: 'Villanueva Cruz', role: UserRole.doctor },
    }),
    prisma.user.upsert({
      where: { tenant_id_email: { tenant_id: tenant.id, email: 'doctor2@bienestar.maosystems.io' } },
      update: {},
      create: { tenant_id: tenant.id, email: 'doctor2@bienestar.maosystems.io', password_hash: passwordHash, first_name: 'Patricia', last_name: 'Rojas Vargas', role: UserRole.doctor },
    }),
    prisma.user.upsert({
      where: { tenant_id_email: { tenant_id: tenant.id, email: 'doctor3@bienestar.maosystems.io' } },
      update: {},
      create: { tenant_id: tenant.id, email: 'doctor3@bienestar.maosystems.io', password_hash: passwordHash, first_name: 'Andrés', last_name: 'Flores Mamani', role: UserRole.doctor },
    }),
    prisma.user.upsert({
      where: { tenant_id_email: { tenant_id: tenant.id, email: 'recepcion@bienestar.maosystems.io' } },
      update: {},
      create: { tenant_id: tenant.id, email: 'recepcion@bienestar.maosystems.io', password_hash: passwordHash, first_name: 'Rosa', last_name: 'Condori Quispe', role: UserRole.receptionist },
    }),
  ])
  void adminUser; void receptionUser

  const [doctor1, doctor2, doctor3] = await Promise.all([
    prisma.doctor.upsert({ where: { user_id: doc1User.id }, update: {}, create: { tenant_id: tenant.id, user_id: doc1User.id, specialty: 'Pediatría', cmp: '94567', consultation_duration: 25 } }),
    prisma.doctor.upsert({ where: { user_id: doc2User.id }, update: {}, create: { tenant_id: tenant.id, user_id: doc2User.id, specialty: 'Ginecología', cmp: '85678', consultation_duration: 30 } }),
    prisma.doctor.upsert({ where: { user_id: doc3User.id }, update: {}, create: { tenant_id: tenant.id, user_id: doc3User.id, specialty: 'Medicina Interna', cmp: '76789', consultation_duration: 30 } }),
  ])

  const doctorIds = [doctor1.id, doctor2.id, doctor3.id]
  for (const [doctorId, days] of [
    [doctor1.id, [1, 2, 3, 4, 5]],
    [doctor2.id, [1, 3, 5]],
    [doctor3.id, [2, 4]],
  ] as [string, number[]][]) {
    for (const day of days) {
      await prisma.doctorSchedule.upsert({
        where: { doctor_id_day_of_week: { doctor_id: doctorId, day_of_week: day } },
        update: {},
        create: { tenant_id: tenant.id, doctor_id: doctorId, day_of_week: day, start_time: '08:00', end_time: '16:00' },
      })
    }
  }

  // Patients (22)
  const usedDnis = new Set<string>()
  const patientIds: string[] = []
  for (let i = 0; i < 22; i++) {
    const isMale = Math.random() < 0.5
    const patient = await prisma.patient.upsert({
      where: { tenant_id_dni: { tenant_id: tenant.id, dni: generateDni(usedDnis) } },
      update: {},
      create: {
        id: uuidv4(), tenant_id: tenant.id,
        first_name: pick(isMale ? MALE_NAMES : FEMALE_NAMES),
        last_name: `${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`,
        dni: [...usedDnis][usedDnis.size - 1],
        phone: `9${String(randInt(10000000, 99999999))}`,
        sex: isMale ? 'M' : 'F',
        date_of_birth: new Date(randInt(1960, 2010), randInt(0, 11), randInt(1, 28)),
        blood_type: pick(BLOOD_TYPES), district: pick(DISTRICTS),
        allergies: Math.random() < 0.2 ? pick(ALLERGIES) : null,
      },
    })
    patientIds.push(patient.id)
  }

  // Appointments (25): 2 today, 3 tomorrow, rest over 12 days
  const { appointmentsData, completedApptIds, buildAppt } = makeApptBuilder(tenant.id, today, patientIds, doctorIds)
  for (let i = 0; i < 7; i++) buildAppt(-randInt(2, 20), AppointmentStatus.completed)
  for (let i = 0; i < 2; i++) buildAppt(0, AppointmentStatus.confirmed)
  for (let i = 0; i < 3; i++) buildAppt(1, AppointmentStatus.confirmed)
  for (let i = 0; i < 13; i++) buildAppt(randInt(2, 12), AppointmentStatus.pending)

  await prisma.appointment.createMany({ data: appointmentsData, skipDuplicates: true })

  const consultations = buildConsultations(tenant.id, completedApptIds, appointmentsData)
  await prisma.consultation.createMany({ data: consultations, skipDuplicates: true })

  console.log(`       ✓ ${patientIds.length} patients · ${appointmentsData.length} appts · ${consultations.length} consultations · 0 invoices`)
}

// ─── Tenant 5: Clínica Santa Lucía ────────────────────────────────────────────
async function seedTenant5(passwordHash: string, today: Date) {
  console.log('  [5/5] Seeding Clínica Santa Lucía…')

  // Gynecology / women's health palette: purple / pink / dark purple sidebar
  const theme = {
    primary: '#9B4D96', primary_light: '#F8EEF8', primary_dark: '#6D3369',
    secondary: '#E8729A', secondary_light: '#FFF0F5',
    surface: '#FDF8FE', sidebar_bg: '#5C2D6B', sidebar_text: '#FFFFFF',
    border_radius: '8px', logo_url: null as string | null,
  }
  const logoUrl = writeLogo('santalucia.svg', makeLogoSvg('Clínica Santa Lucía', '#9B4D96'))
  theme.logo_url = logoUrl

  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'santalucia' },
    update: { plan_price_soles: 350, features: { whatsapp_reminders: true, hce: true, billing: true, dashboard_kpis: true, custom_theme: true }, theme_config: theme },
    create: {
      name: 'Clínica Santa Lucía', ruc: '20567890123', subdomain: 'santalucia',
      plan: 'clinica', plan_price_soles: 350,
      theme_config: theme,
      features: { whatsapp_reminders: true, hce: true, billing: true, dashboard_kpis: true, custom_theme: true },
    },
  })

  const [adminUser, doc1User, doc2User] = await Promise.all([
    prisma.user.upsert({
      where: { tenant_id_email: { tenant_id: tenant.id, email: 'admin@santalucia.maosystems.io' } },
      update: {},
      create: { tenant_id: tenant.id, email: 'admin@santalucia.maosystems.io', password_hash: passwordHash, first_name: 'Luciana', last_name: 'Castillo Herrera', role: UserRole.admin },
    }),
    prisma.user.upsert({
      where: { tenant_id_email: { tenant_id: tenant.id, email: 'doctor1@santalucia.maosystems.io' } },
      update: {},
      create: { tenant_id: tenant.id, email: 'doctor1@santalucia.maosystems.io', password_hash: passwordHash, first_name: 'Valeria', last_name: 'Ramos Díaz', role: UserRole.doctor },
    }),
    prisma.user.upsert({
      where: { tenant_id_email: { tenant_id: tenant.id, email: 'doctor2@santalucia.maosystems.io' } },
      update: {},
      create: { tenant_id: tenant.id, email: 'doctor2@santalucia.maosystems.io', password_hash: passwordHash, first_name: 'Miguel', last_name: 'Gutiérrez Rivera', role: UserRole.doctor },
    }),
  ])
  void adminUser

  const [doctor1, doctor2] = await Promise.all([
    prisma.doctor.upsert({ where: { user_id: doc1User.id }, update: {}, create: { tenant_id: tenant.id, user_id: doc1User.id, specialty: 'Ginecología', cmp: '57890', consultation_duration: 30 } }),
    prisma.doctor.upsert({ where: { user_id: doc2User.id }, update: {}, create: { tenant_id: tenant.id, user_id: doc2User.id, specialty: 'Obstetricia', cmp: '68901', consultation_duration: 35 } }),
  ])

  for (const [doctorId, days] of [
    [doctor1.id, [1, 2, 3, 4, 5]],
    [doctor2.id, [2, 4, 6]],
  ] as [string, number[]][]) {
    for (const day of days) {
      await prisma.doctorSchedule.upsert({
        where: { doctor_id_day_of_week: { doctor_id: doctorId, day_of_week: day } },
        update: {},
        create: { tenant_id: tenant.id, doctor_id: doctorId, day_of_week: day, start_time: '09:00', end_time: '17:00' },
      })
    }
  }

  // Patients (12)
  const usedDnis = new Set<string>()
  const patientIds: string[] = []
  for (let i = 0; i < 12; i++) {
    const patient = await prisma.patient.upsert({
      where: { tenant_id_dni: { tenant_id: tenant.id, dni: generateDni(usedDnis) } },
      update: {},
      create: {
        id: uuidv4(), tenant_id: tenant.id,
        first_name: pick(FEMALE_NAMES),
        last_name: `${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`,
        dni: [...usedDnis][usedDnis.size - 1],
        phone: `9${String(randInt(10000000, 99999999))}`,
        sex: 'F',
        date_of_birth: new Date(randInt(1975, 2000), randInt(0, 11), randInt(1, 28)),
        blood_type: pick(BLOOD_TYPES), district: pick(DISTRICTS),
      },
    })
    patientIds.push(patient.id)
  }

  // Appointments (14): 1 today, 2 tomorrow, rest over 8 days
  const { appointmentsData, completedApptIds, buildAppt } = makeApptBuilder(tenant.id, today, patientIds, [doctor1.id, doctor2.id])
  for (let i = 0; i < 4; i++) buildAppt(-randInt(2, 15), AppointmentStatus.completed)
  buildAppt(0, AppointmentStatus.confirmed)
  for (let i = 0; i < 2; i++) buildAppt(1, AppointmentStatus.pending)
  for (let i = 0; i < 7; i++) buildAppt(randInt(2, 8), AppointmentStatus.pending)

  await prisma.appointment.createMany({ data: appointmentsData, skipDuplicates: true })

  const consultations = buildConsultations(tenant.id, completedApptIds, appointmentsData)
  await prisma.consultation.createMany({ data: consultations, skipDuplicates: true })

  // Invoices (up to 5) — billing IS enabled for this tenant.
  // Delete + recreate on every run: `skipDuplicates` can't be used here because each
  // run generates new invoice UUIDs. If a prior run already created invoices,
  // createMany would skip them (unique on [tenant_id, series, number]) but then
  // invoiceItem.createMany would try to FK-reference the new (never-inserted) UUIDs
  // → P2003 foreign-key violation. Wipe-then-insert is the safe idempotent path.
  await prisma.invoiceItem.deleteMany({ where: { invoice: { tenant_id: tenant.id } } })
  await prisma.invoice.deleteMany({ where: { tenant_id: tenant.id } })

  const invoices = buildInvoices(tenant.id, consultations, appointmentsData)
  const invoicesToCreate = invoices.slice(0, 5)
  if (invoicesToCreate.length > 0) {
    await prisma.invoice.createMany({
      data: invoicesToCreate.map(({ items: _items, ...inv }) => inv),
    })
    await prisma.invoiceItem.createMany({
      data: invoicesToCreate.flatMap((inv) =>
        inv.items.map((item) => ({
          id: uuidv4(), invoice_id: inv.id,
          description: item.description, quantity: 1,
          unit_price: item.unitPrice, total: item.unitPrice,
        })),
      ),
    })
  }

  console.log(`       ✓ ${patientIds.length} patients · ${appointmentsData.length} appts · ${consultations.length} consultations · ${invoicesToCreate.length} invoices`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding demo tenants (multi-tenant showcase)...\n')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const passwordHash = await bcrypt.hash('Demo2026!', 10)

  // Each tenant wrapped in its own transaction for atomic isolation
  await prisma.$transaction(async () => { await seedTenant1() }, { timeout: 30000 })
  await prisma.$transaction(async () => { await seedTenant2(passwordHash, today) }, { timeout: 60000 })
  await prisma.$transaction(async () => { await seedTenant3(passwordHash, today) }, { timeout: 60000 })
  await prisma.$transaction(async () => { await seedTenant4(passwordHash, today) }, { timeout: 60000 })
  await prisma.$transaction(async () => { await seedTenant5(passwordHash, today) }, { timeout: 60000 })

  // ── Summary ─────────────────────────────────────────────────────────────────
  const tenants = await prisma.tenant.findMany({ select: { name: true, subdomain: true, plan: true, plan_price_soles: true, features: true } })

  console.log('\n✅ Demo tenants seed completed!')
  console.log()
  console.log('┌─────────────────────────────────────────────────────────────────────────────────────────┐')
  console.log('│ Tenant                      │ Subdomain    │ Plan         │ MRR (S/) │ Flags ON         │')
  console.log('├─────────────────────────────────────────────────────────────────────────────────────────┤')
  for (const t of tenants) {
    const f = t.features as Record<string, boolean>
    const flags = ['whatsapp_reminders','hce','billing','dashboard_kpis','custom_theme']
      .filter((k) => f[k]).map((k) => k.substring(0,3)).join(',')
    const name = t.name.substring(0,28).padEnd(28)
    const sub = t.subdomain.padEnd(12)
    const plan = t.plan.padEnd(12)
    const mrr = String(Number(t.plan_price_soles)).padStart(8)
    console.log(`│ ${name} │ ${sub} │ ${plan} │ ${mrr} │ ${flags.padEnd(16)} │`)
  }
  console.log('└─────────────────────────────────────────────────────────────────────────────────────────┘')
  console.log()
  console.log('All demo passwords: Demo2026!')
  console.log('SuperAdmin:         superadmin@maosystems.io / SuperAdmin2026!')
  console.log()
  console.log('SuperAdmin panel:   http://localhost:5173/platform/login')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
