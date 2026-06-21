/**
 * Seed script — Clinova demo tenant (Clínica San Rafael)
 * Run with: pnpm db:seed   (npx ts-node prisma/seed.ts)
 *
 * Fixed IDs so tests and slash commands can reference them:
 *   DEMO_TENANT_ID       00000000-0000-0000-0000-000000000001
 *   DEMO_ADMIN_ID        00000000-0000-0000-0000-000000000002
 *   DEMO_DOC1_USER_ID    00000000-0000-0000-0000-000000000003  (Dr. García)
 *   DEMO_DOC2_USER_ID    00000000-0000-0000-0000-000000000004  (Dra. Mendoza)
 *   DEMO_DOC3_USER_ID    00000000-0000-0000-0000-000000000005  (Dr. Quispe)
 *   DEMO_DOCTOR1_ID      00000000-0000-0000-0000-000000000006  (Doctor record)
 *   DEMO_DOCTOR2_ID      00000000-0000-0000-0000-000000000007
 *   DEMO_DOCTOR3_ID      00000000-0000-0000-0000-000000000008
 *   DEMO_RECEPTIONIST_ID 00000000-0000-0000-0000-000000000009
 */

import { PrismaClient, UserRole, AppointmentStatus, InvoiceType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

// ─── Fixed IDs ────────────────────────────────────────────────────────────────
const DEMO_TENANT_ID       = '00000000-0000-0000-0000-000000000001'
const DEMO_ADMIN_ID        = '00000000-0000-0000-0000-000000000002'
const DEMO_DOC1_USER_ID    = '00000000-0000-0000-0000-000000000003'
const DEMO_DOC2_USER_ID    = '00000000-0000-0000-0000-000000000004'
const DEMO_DOC3_USER_ID    = '00000000-0000-0000-0000-000000000005'
const DEMO_DOCTOR1_ID      = '00000000-0000-0000-0000-000000000006'
const DEMO_DOCTOR2_ID      = '00000000-0000-0000-0000-000000000007'
const DEMO_DOCTOR3_ID      = '00000000-0000-0000-0000-000000000008'
const DEMO_RECEPTIONIST_ID = '00000000-0000-0000-0000-000000000009'

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Reference data ───────────────────────────────────────────────────────────
const MALE_NAMES = [
  'Carlos', 'Juan', 'Luis', 'Jorge', 'Miguel',
  'Roberto', 'César', 'Fernando', 'Manuel', 'Alejandro',
] as const

const FEMALE_NAMES = [
  'María', 'Carmen', 'Rosa', 'Ana', 'Patricia',
  'Lucía', 'Sandra', 'Gloria', 'Elena', 'Mónica',
] as const

const LAST_NAMES = [
  'García', 'Quispe', 'Mamani', 'Torres', 'López', 'Flores', 'Huanca', 'Condori',
  'Rivera', 'Chávez', 'Morales', 'Vega', 'Cruz', 'Rojas', 'Mendoza', 'Castillo',
  'Vargas', 'Gutiérrez', 'Ramos', 'Sánchez', 'Paredes', 'Villanueva', 'Herrera', 'Díaz',
] as const

const DISTRICTS = [
  'Miraflores', 'San Borja', 'San Isidro', 'Surco', 'La Molina',
  'Magdalena', 'Pueblo Libre', 'Jesús María', 'Lince', 'San Miguel',
] as const

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const

const ALLERGIES = [
  'Alergia a la penicilina',
  'Alergia a los AINEs (ibuprofeno, aspirina)',
  'Alergia al látex',
  'Rinitis alérgica estacional',
  'Alergia a los mariscos',
  'Alergia al polvo y ácaros',
] as const

const MED_HISTORIES = [
  'Hipertensión arterial en tratamiento desde 2018',
  'Diabetes mellitus tipo 2 diagnosticada en 2020',
  'Asma bronquial desde la infancia, controlada con inhalador',
  'Hipotiroidismo en tratamiento con levotiroxina',
  'Gastritis crónica diagnosticada en 2019',
  'Antecedente de apendicectomía en 2015',
  'Cardiopatía isquémica, stent coronario en 2021',
  'Artritis reumatoide en tratamiento con metotrexato',
  'Anemia ferropénica recurrente',
  'Migraña crónica en tratamiento preventivo',
] as const

const ICD10 = [
  { code: 'J06.9', description: 'Infección aguda de las vías respiratorias superiores' },
  { code: 'K21.0', description: 'Enfermedad por reflujo gastroesofágico con esofagitis' },
  { code: 'M54.5', description: 'Dolor en la región lumbar' },
  { code: 'J45.9', description: 'Asma no especificada' },
  { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin complicaciones' },
  { code: 'I10',   description: 'Hipertensión esencial (primaria)' },
  { code: 'K29.7', description: 'Gastritis no especificada' },
  { code: 'N39.0', description: 'Infección de vías urinarias, sitio no especificado' },
  { code: 'J03.9', description: 'Amigdalitis aguda no especificada' },
  { code: 'B34.9', description: 'Infección viral no especificada' },
] as const

const REASONS = [
  'Control mensual',
  'Dolor de cabeza',
  'Fiebre',
  'Revisión de exámenes',
  'Consulta prenatal',
  'Control pediátrico',
  'Malestar general',
  'Renovar receta',
  'Seguimiento de tratamiento',
] as const

const COMPLAINTS = [
  'Paciente refiere dolor de cabeza persistente desde hace 3 días',
  'Tos y secreción nasal abundante desde hace 5 días',
  'Dolor abdominal en epigastrio postprandial de moderada intensidad',
  'Dolor lumbar que se irradia hacia miembro inferior derecho',
  'Dificultad respiratoria leve y presencia de sibilancias',
  'Fiebre de 38.5°C y malestar general desde el día de ayer',
  'Ardor y dolor al orinar desde hace 2 días, sin fiebre asociada',
  'Dolor de garganta intenso con dificultad para deglutir alimentos',
  'Acude para control rutinario de presión arterial',
  'Refiere mareos y náuseas ocasionales en las mañanas',
] as const

const TREATMENTS = [
  'Reposo relativo por 3 días. Hidratación abundante. Dieta blanda. Control si no mejora.',
  'Antibioticoterapia y analgésico según indicación. Control en 7 días.',
  'Dieta hiposódica e hipograsa. Actividad física moderada. Control en 30 días.',
  'Fisioterapia 3 veces por semana. Evitar cargas pesadas. AINES según intensidad del dolor.',
  'Uso de inhalador de rescate según necesidad. Evitar alérgenos. Espirometría en próxima visita.',
  'Reposo por 2 días. Paracetamol 500mg cada 6 horas si fiebre supera 38.5°C.',
  'Antibioticoterapia por 7 días. Hidratación oral abundante. Higiene adecuada.',
  'Ibuprofeno 400mg cada 8 horas por 5 días con alimentos. Gárgaras con agua tibia y sal.',
  'Continuar medicación antihipertensiva. Control de PA diario. Dieta hiposódica estricta.',
  'Dieta blanda y fraccionada. Omeprazol antes de comidas. Evitar AINEs, café y alcohol.',
] as const

const MEDICATIONS = [
  { medication: 'Amoxicilina 500mg',    dosage: '500mg',        frequency: 'Cada 8 horas',                  duration_days: 7  },
  { medication: 'Paracetamol 500mg',    dosage: '500mg',        frequency: 'Cada 6 horas si hay dolor',      duration_days: 5  },
  { medication: 'Ibuprofeno 400mg',     dosage: '400mg',        frequency: 'Cada 8 horas con alimentos',     duration_days: 5  },
  { medication: 'Omeprazol 20mg',       dosage: '20mg',         frequency: 'Una vez al día en ayunas',       duration_days: 30 },
  { medication: 'Metformina 500mg',     dosage: '500mg',        frequency: 'Dos veces al día con comidas',   duration_days: 30 },
  { medication: 'Enalapril 10mg',       dosage: '10mg',         frequency: 'Una vez al día',                 duration_days: 30 },
  { medication: 'Azitromicina 500mg',   dosage: '500mg',        frequency: 'Una vez al día',                 duration_days: 3  },
  { medication: 'Loratadina 10mg',      dosage: '10mg',         frequency: 'Una vez al día',                 duration_days: 10 },
  { medication: 'Ranitidina 150mg',     dosage: '150mg',        frequency: 'Dos veces al día',               duration_days: 14 },
  { medication: 'Vitamina C 500mg',     dosage: '500mg',        frequency: 'Una vez al día',                 duration_days: 30 },
  { medication: 'Complejo B',           dosage: '1 comprimido', frequency: 'Una vez al día',                 duration_days: 30 },
  { medication: 'Calcio + Vitamina D3', dosage: '500mg/400UI',  frequency: 'Una vez al día con comidas',     duration_days: 30 },
] as const

const DOCTOR_CONFIGS = [
  { id: DEMO_DOCTOR1_ID, duration: 20 },
  { id: DEMO_DOCTOR2_ID, duration: 30 },
  { id: DEMO_DOCTOR3_ID, duration: 25 },
] as const

const BUSINESS_HOURS = [8, 9, 10, 11, 12, 14, 15, 16, 17] as const

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting seed...')

  // ── Cleanup (reverse dependency order) ────────────────────────────────────
  await prisma.reminder.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.prescriptionItem.deleteMany()
  await prisma.prescription.deleteMany()
  await prisma.consultation.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.doctorSchedule.deleteMany()
  await prisma.serviceCatalog.deleteMany()
  await prisma.specialty.deleteMany()
  await prisma.doctor.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()

  // ── Tenant ────────────────────────────────────────────────────────────────
  await prisma.tenant.create({
    data: {
      id: DEMO_TENANT_ID,
      name: 'Clínica San Rafael',
      ruc: '20123456789',
      subdomain: 'sanrafael',
      plan: 'clinica',
      plan_price_soles: 350,
      theme_config: {
        primary: '#1A5F9E',
        primary_light: '#E6F1FB',
        primary_dark: '#0C3F6B',
        secondary: '#2EAA6E',
        secondary_light: '#E8F5EE',
        surface: '#F7FAFB',
        sidebar_bg: '#1A2740',
        sidebar_text: '#FFFFFF',
        border_radius: '8px',
        logo_url: null,
      },
      // All modules enabled — this is the primary demo tenant, must show everything
      features: {
        whatsapp_reminders: true,
        hce: true,
        billing: true,
        dashboard_kpis: true,
        custom_theme: true,
      },
    },
  })

  // Single bcrypt hash reused for all demo users (10 rounds per CLAUDE.md)
  const passwordHash = await bcrypt.hash('Demo2026!', 10)

  // ── Users ─────────────────────────────────────────────────────────────────
  await prisma.user.createMany({
    data: [
      {
        id: DEMO_ADMIN_ID,
        tenant_id: DEMO_TENANT_ID,
        email: 'admin@sanrafael.maosystems.io',
        password_hash: passwordHash,
        first_name: 'Carmen',
        last_name: 'Flores',
        role: UserRole.admin,
      },
      {
        id: DEMO_DOC1_USER_ID,
        tenant_id: DEMO_TENANT_ID,
        email: 'dr.garcia@sanrafael.maosystems.io',
        password_hash: passwordHash,
        first_name: 'Carlos',
        last_name: 'García Torres',
        role: UserRole.doctor,
      },
      {
        id: DEMO_DOC2_USER_ID,
        tenant_id: DEMO_TENANT_ID,
        email: 'dr.mendoza@sanrafael.maosystems.io',
        password_hash: passwordHash,
        first_name: 'Ana',
        last_name: 'Mendoza Ríos',
        role: UserRole.doctor,
      },
      {
        id: DEMO_DOC3_USER_ID,
        tenant_id: DEMO_TENANT_ID,
        email: 'dr.quispe@sanrafael.maosystems.io',
        password_hash: passwordHash,
        first_name: 'Roberto',
        last_name: 'Quispe Mamani',
        role: UserRole.doctor,
      },
      {
        id: DEMO_RECEPTIONIST_ID,
        tenant_id: DEMO_TENANT_ID,
        email: 'recepcion@sanrafael.maosystems.io',
        password_hash: passwordHash,
        first_name: 'Lucía',
        last_name: 'Paredes',
        role: UserRole.receptionist,
      },
    ],
  })

  // ── Doctors ───────────────────────────────────────────────────────────────
  await prisma.doctor.createMany({
    data: [
      {
        id: DEMO_DOCTOR1_ID,
        tenant_id: DEMO_TENANT_ID,
        user_id: DEMO_DOC1_USER_ID,
        specialty: 'Medicina General',
        cmp: '45231',
        consultation_duration: 20,
      },
      {
        id: DEMO_DOCTOR2_ID,
        tenant_id: DEMO_TENANT_ID,
        user_id: DEMO_DOC2_USER_ID,
        specialty: 'Ginecología',
        cmp: '38764',
        consultation_duration: 30,
      },
      {
        id: DEMO_DOCTOR3_ID,
        tenant_id: DEMO_TENANT_ID,
        user_id: DEMO_DOC3_USER_ID,
        specialty: 'Pediatría',
        cmp: '52108',
        consultation_duration: 25,
      },
    ],
  })

  // ── Doctor schedules ──────────────────────────────────────────────────────
  // Unique constraint: [doctor_id, day_of_week]. Two-shift days (Dr. Quispe Mon)
  // use the wider range (08:00–18:00) as a single row per the constraint.
  await prisma.doctorSchedule.createMany({
    data: [
      // Dr. García — Medicina General (Mon–Sat, mornings; Thu afternoon)
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR1_ID, day_of_week: 1, start_time: '08:00', end_time: '13:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR1_ID, day_of_week: 2, start_time: '08:00', end_time: '13:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR1_ID, day_of_week: 3, start_time: '08:00', end_time: '13:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR1_ID, day_of_week: 4, start_time: '14:00', end_time: '19:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR1_ID, day_of_week: 5, start_time: '08:00', end_time: '13:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR1_ID, day_of_week: 6, start_time: '08:00', end_time: '12:00' },

      // Dra. Mendoza — Ginecología (4-day specialist schedule)
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR2_ID, day_of_week: 1, start_time: '09:00', end_time: '14:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR2_ID, day_of_week: 3, start_time: '09:00', end_time: '14:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR2_ID, day_of_week: 4, start_time: '09:00', end_time: '14:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR2_ID, day_of_week: 5, start_time: '15:00', end_time: '19:00' },

      // Dr. Quispe — Pediatría (Mon wide range covers split shift; Tue–Sat mornings)
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR3_ID, day_of_week: 1, start_time: '08:00', end_time: '18:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR3_ID, day_of_week: 2, start_time: '08:00', end_time: '12:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR3_ID, day_of_week: 3, start_time: '08:00', end_time: '12:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR3_ID, day_of_week: 4, start_time: '08:00', end_time: '12:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR3_ID, day_of_week: 5, start_time: '08:00', end_time: '12:00' },
      { tenant_id: DEMO_TENANT_ID, doctor_id: DEMO_DOCTOR3_ID, day_of_week: 6, start_time: '09:00', end_time: '12:00' },
    ],
  })

  // ── Service catalog ───────────────────────────────────────────────────────
  await prisma.serviceCatalog.createMany({
    data: [
      // Consultas
      { tenant_id: DEMO_TENANT_ID, name: 'Consulta médica general',  price: 80.00,  category: 'Consultas',     sort_order: 1  },
      { tenant_id: DEMO_TENANT_ID, name: 'Consulta de especialidad', price: 120.00, category: 'Consultas',     sort_order: 2  },
      { tenant_id: DEMO_TENANT_ID, name: 'Consulta de urgencia',     price: 100.00, category: 'Consultas',     sort_order: 3  },
      { tenant_id: DEMO_TENANT_ID, name: 'Control y seguimiento',    price: 60.00,  category: 'Consultas',     sort_order: 4  },
      // Procedimientos
      { tenant_id: DEMO_TENANT_ID, name: 'Inyectable / vacuna',      price: 25.00,  category: 'Procedimientos', sort_order: 10 },
      { tenant_id: DEMO_TENANT_ID, name: 'Curación de herida',       price: 40.00,  category: 'Procedimientos', sort_order: 11 },
      { tenant_id: DEMO_TENANT_ID, name: 'Extracción de puntos',     price: 30.00,  category: 'Procedimientos', sort_order: 12 },
      // Laboratorio
      { tenant_id: DEMO_TENANT_ID, name: 'Hemograma completo',       price: 35.00,  category: 'Laboratorio',   sort_order: 20 },
      { tenant_id: DEMO_TENANT_ID, name: 'Glucosa en ayunas',        price: 20.00,  category: 'Laboratorio',   sort_order: 21 },
      { tenant_id: DEMO_TENANT_ID, name: 'Perfil lipídico',          price: 45.00,  category: 'Laboratorio',   sort_order: 22 },
      // Imágenes
      { tenant_id: DEMO_TENANT_ID, name: 'Ecografía abdominal',      price: 80.00,  category: 'Imágenes',      sort_order: 30 },
      { tenant_id: DEMO_TENANT_ID, name: 'Radiografía (1 placa)',    price: 50.00,  category: 'Imágenes',      sort_order: 31 },
    ],
  })

  // ── Specialties ───────────────────────────────────────────────────────────
  await prisma.specialty.createMany({
    data: [
      { tenant_id: DEMO_TENANT_ID, name: 'Medicina General',              sort_order: 1  },
      { tenant_id: DEMO_TENANT_ID, name: 'Ginecología y Obstetricia',     sort_order: 2  },
      { tenant_id: DEMO_TENANT_ID, name: 'Pediatría',                     sort_order: 3  },
      { tenant_id: DEMO_TENANT_ID, name: 'Traumatología y Ortopedia',     sort_order: 4  },
      { tenant_id: DEMO_TENANT_ID, name: 'Cardiología',                   sort_order: 5  },
      { tenant_id: DEMO_TENANT_ID, name: 'Dermatología',                  sort_order: 6  },
      { tenant_id: DEMO_TENANT_ID, name: 'Gastroenterología',             sort_order: 7  },
      { tenant_id: DEMO_TENANT_ID, name: 'Oftalmología',                  sort_order: 8  },
      { tenant_id: DEMO_TENANT_ID, name: 'Odontología',                   sort_order: 9  },
      { tenant_id: DEMO_TENANT_ID, name: 'Neurología',                    sort_order: 10 },
      { tenant_id: DEMO_TENANT_ID, name: 'Psiquiatría',                   sort_order: 11 },
      { tenant_id: DEMO_TENANT_ID, name: 'Endocrinología',                sort_order: 12 },
      { tenant_id: DEMO_TENANT_ID, name: 'Urología',                      sort_order: 13 },
      { tenant_id: DEMO_TENANT_ID, name: 'Otorrinolaringología',           sort_order: 14 },
      { tenant_id: DEMO_TENANT_ID, name: 'Medicina Interna',              sort_order: 15 },
    ],
  })

  // ── Patients (50) ─────────────────────────────────────────────────────────
  const usedDnis = new Set<string>()
  const patientIds: string[] = []

  const patientsData = Array.from({ length: 50 }, () => {
    const isMale = Math.random() < 0.5
    const firstName = pick(isMale ? MALE_NAMES : FEMALE_NAMES)
    const lastName   = `${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`

    // Guarantee uniqueness within this seed run
    let dni: string
    do { dni = String(randInt(10000000, 99999999)) } while (usedDnis.has(dni))
    usedDnis.add(dni)

    const phone = `9${String(randInt(10000000, 99999999))}`   // 9 + 8 digits
    const dob   = new Date(randInt(1955, 2005), randInt(0, 11), randInt(1, 28))
    const id    = uuidv4()
    patientIds.push(id)

    return {
      id,
      tenant_id:       DEMO_TENANT_ID,
      first_name:      firstName,
      last_name:       lastName,
      dni,
      phone,
      sex:             isMale ? 'M' : 'F',
      date_of_birth:   dob,
      blood_type:      pick(BLOOD_TYPES),
      district:        pick(DISTRICTS),
      allergies:       Math.random() < 0.3 ? pick(ALLERGIES)     : null,
      medical_history: Math.random() < 0.2 ? pick(MED_HISTORIES) : null,
    }
  })

  await prisma.patient.createMany({ data: patientsData })

  // ── Appointments (60) ─────────────────────────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  type ApptRow = {
    id:            string
    tenant_id:     string
    patient_id:    string
    doctor_id:     string
    scheduled_at:  Date
    duration_min:  number
    status:        AppointmentStatus
    reason:        string
    reminder_sent: boolean
  }

  const appointmentsData: ApptRow[]                            = []
  const completedApptIds: string[]                             = []
  const reminderAppts:    { id: string; scheduled_at: Date }[] = []

  function buildAppt(
    daysOffset:   number,
    status:       AppointmentStatus,
    doctorIdx:    number,
    reminderSent: boolean = false,
  ): string {
    const id          = uuidv4()
    const doc         = DOCTOR_CONFIGS[doctorIdx % 3]
    const scheduledAt = atHour(addDays(today, daysOffset), pick(BUSINESS_HOURS), pick([0, 15, 30, 45]))
    appointmentsData.push({
      id,
      tenant_id:     DEMO_TENANT_ID,
      patient_id:    pick(patientIds),
      doctor_id:     doc.id,
      scheduled_at:  scheduledAt,
      duration_min:  doc.duration,
      status,
      reason:        pick(REASONS),
      reminder_sent: reminderSent,
    })
    if (reminderSent) reminderAppts.push({ id, scheduled_at: scheduledAt })
    return id
  }

  // 20 past (1–30 days ago): 80 % completed · 20 % cancelled
  // Completed past appointments had reminders sent before the appointment (~70%)
  for (let i = 0; i < 20; i++) {
    const isCompleted   = Math.random() < 0.8
    const reminderSent  = isCompleted && Math.random() < 0.7
    const id = buildAppt(
      -randInt(1, 30),
      isCompleted ? AppointmentStatus.completed : AppointmentStatus.cancelled,
      i,
      reminderSent,
    )
    if (isCompleted) completedApptIds.push(id)
  }

  // 10 today / tomorrow: all have reminder_sent — 24h rule fires for same-day and next-day
  for (let i = 0; i < 10; i++) {
    buildAppt(
      i < 5 ? 0 : 1,
      Math.random() < 0.6 ? AppointmentStatus.confirmed : AppointmentStatus.pending,
      i,
      true,
    )
  }

  // 30 future (2–14 days): reminder not yet sent
  for (let i = 0; i < 30; i++) {
    buildAppt(
      randInt(2, 14),
      Math.random() < 0.4 ? AppointmentStatus.confirmed : AppointmentStatus.pending,
      i,
      false,
    )
  }

  await prisma.appointment.createMany({ data: appointmentsData })

  // ── WhatsApp Reminder records ──────────────────────────────────────────────
  // One Reminder row per appointment with reminder_sent = true.
  // sent_at = 24 h before the scheduled appointment (simulates the auto-job).
  if (reminderAppts.length > 0) {
    await prisma.reminder.createMany({
      data: reminderAppts.map(({ id: apptId, scheduled_at }) => ({
        id:             uuidv4(),
        tenant_id:      DEMO_TENANT_ID,
        appointment_id: apptId,
        channel:        'whatsapp',
        status:         'sent',
        message:        'Recordatorio: tienes una cita en Clínica San Rafael mañana a la hora indicada. Ante cualquier consulta, escríbenos.',
        sent_at:        new Date(scheduled_at.getTime() - 24 * 60 * 60 * 1000),
      })),
    })
  }

  // ── Consultations (one per completed appointment) ─────────────────────────
  type ConsultRow = {
    id:               string
    tenant_id:        string
    appointment_id:   string
    chief_complaint:  string
    diagnosis:        string
    icd10_code:       string
    icd10_description:string
    treatment:        string
    follow_up_date:   Date | null
  }

  const consultationData: ConsultRow[] = completedApptIds.map((apptId) => {
    const icd  = pick(ICD10)
    const appt = appointmentsData.find(a => a.id === apptId)!
    return {
      id:                uuidv4(),
      tenant_id:         DEMO_TENANT_ID,
      appointment_id:    apptId,
      chief_complaint:   pick(COMPLAINTS),
      diagnosis:         `${icd.description}. ${Math.random() < 0.5 ? 'Cuadro leve a moderado.' : 'Requiere seguimiento y control.'}`,
      icd10_code:        icd.code,
      icd10_description: icd.description,
      treatment:         pick(TREATMENTS),
      follow_up_date:    Math.random() < 0.4 ? addDays(appt.scheduled_at, randInt(7, 30)) : null,
    }
  })

  await prisma.consultation.createMany({ data: consultationData })

  // ── Prescriptions (~50 % of consultations) ────────────────────────────────
  type RxRow = {
    id:              string
    tenant_id:       string
    consultation_id: string
    instructions:    string
    issued_at:       Date
  }

  const prescriptionData: RxRow[] = consultationData
    .filter(() => Math.random() < 0.5)
    .map((c) => {
      const appt = appointmentsData.find(a => a.id === c.appointment_id)!
      return {
        id:              uuidv4(),
        tenant_id:       DEMO_TENANT_ID,
        consultation_id: c.id,
        instructions:    'Tomar los medicamentos según indicación. No automedicarse. Regresar si los síntomas persisten o empeoran.',
        issued_at:       appt.scheduled_at,
      }
    })

  await prisma.prescription.createMany({ data: prescriptionData })

  // ── Prescription Items (1–3 per prescription) ─────────────────────────────
  const prescriptionItemsData = prescriptionData.flatMap((rx) => {
    const count = randInt(1, 3)
    // Shuffle a copy so we pick without repetition
    return [...MEDICATIONS]
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map((med) => ({
        id:              uuidv4(),
        prescription_id: rx.id,
        medication:      med.medication,
        dosage:          med.dosage,
        frequency:       med.frequency,
        duration_days:   med.duration_days,
      }))
  })

  await prisma.prescriptionItem.createMany({ data: prescriptionItemsData })

  // ── Invoices (~40 % of completed consultations) ───────────────────────────
  // Build line-item data alongside invoice data so amounts stay consistent.
  type LineItem  = { description: string; unitPrice: number }
  type InvoiceRow = {
    id:              string
    tenant_id:       string
    patient_id:      string
    consultation_id: string
    type:            InvoiceType
    series:          string
    number:          number
    subtotal:        number
    tax:             number
    total:           number
    currency:        string
    sunat_status:    string
    issued_at:       Date
    lineItems:       LineItem[]   // stripped before DB insert
  }

  let boletaSeq  = 1
  let facturaSeq = 1

  const invoiceRows: InvoiceRow[] = consultationData
    .filter(() => Math.random() < 0.4)
    .map((c) => {
      const appt     = appointmentsData.find(a => a.id === c.appointment_id)!
      const isBoleta = Math.random() < 0.8
      const type     = isBoleta ? InvoiceType.boleta : InvoiceType.factura
      const series   = isBoleta ? 'B001' : 'F001'
      const number   = isBoleta ? boletaSeq++ : facturaSeq++

      const lineItems: LineItem[] = [
        { description: 'Consulta médica', unitPrice: randInt(80, 150) },
      ]
      if (Math.random() < 0.5) {
        lineItems.push({ description: 'Exámenes de laboratorio', unitPrice: randInt(30, 80) })
      }

      const subtotal = lineItems.reduce((s, li) => s + li.unitPrice, 0)
      const tax      = Math.round(subtotal * 0.18 * 100) / 100   // IGV 18 %
      const total    = Math.round((subtotal + tax) * 100) / 100

      return {
        id:              uuidv4(),
        tenant_id:       DEMO_TENANT_ID,
        patient_id:      appt.patient_id,
        consultation_id: c.id,
        type,
        series,
        number,
        subtotal,
        tax,
        total,
        currency:        'PEN',
        sunat_status:    'mock',
        issued_at:       appt.scheduled_at,
        lineItems,
      }
    })

  // Strip helper field before insert
  await prisma.invoice.createMany({
    data: invoiceRows.map(({ lineItems: _li, ...inv }) => inv),
  })

  // ── Invoice Items ─────────────────────────────────────────────────────────
  await prisma.invoiceItem.createMany({
    data: invoiceRows.flatMap((inv) =>
      inv.lineItems.map((li) => ({
        id:          uuidv4(),
        invoice_id:  inv.id,
        description: li.description,
        quantity:    1,
        unit_price:  li.unitPrice,
        total:       li.unitPrice,
      })),
    ),
  })

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed completed!')
  console.log(`   Tenant:           Clínica San Rafael  (subdomain: sanrafael)`)
  console.log(`   Users:            5  (1 admin · 3 doctors · 1 receptionist)`)
  console.log(`   Doctor schedules: 16`)
  console.log(`   Services catalog: 12`)
  console.log(`   Patients:         50`)
  console.log(`   Appointments:     60  (20 past · 10 today/tomorrow · 30 future)`)
  console.log(`   Consultations:    ${consultationData.length}  (all completed appointments)`)
  console.log(`   Prescriptions:    ${prescriptionData.length}  (~50 % of consultations)`)
  console.log(`   Invoices:         ${invoiceRows.length}  (~40 % of consultations)`)
  console.log()
  console.log('Demo credentials — password for all: Demo2026!')
  console.log('   admin@sanrafael.maosystems.io')
  console.log('   dr.garcia@sanrafael.maosystems.io')
  console.log('   dr.mendoza@sanrafael.maosystems.io')
  console.log('   dr.quispe@sanrafael.maosystems.io')
  console.log('   recepcion@sanrafael.maosystems.io')
}

// Export so reset-demo.ts can call it without re-importing prisma or calling $disconnect
export async function seedMain(): Promise<void> {
  await main()
}

// Run directly when invoked via ts-node (pnpm db:seed)
if (require.main === module) {
  seedMain()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}
