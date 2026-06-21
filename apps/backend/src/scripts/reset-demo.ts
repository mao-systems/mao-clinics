/**
 * Demo reset script — MAO Systems
 *
 * Two modes:
 *
 *   Normal (default) — resets ONLY Clínica San Rafael (tenant 1).
 *     Does NOT touch the SuperAdmin or the 4 reference tenants.
 *     Use this before every sales demo.
 *
 *   Full (--full flag) — wipes EVERYTHING and recreates from scratch:
 *     seed.ts → seed-platform.ts → seed-demo-tenants.ts
 *     Use this to recover a broken environment or bootstrap a new one.
 *
 * Usage (local):
 *   pnpm demo:reset:local            ← normal mode
 *   pnpm demo:reset:local -- --full  ← full mode
 *
 * Usage (EC2):
 *   ~/reset-demo.sh                  ← normal mode
 *   ~/reset-demo.sh --full           ← full mode
 */

import { PrismaClient, AppointmentStatus } from '@prisma/client'
import { addDays, startOfDay, setHours, setMinutes } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import readline from 'readline'
import { execSync } from 'child_process'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()
const LIMA_TZ = 'America/Lima'
const IS_FULL = process.argv.includes('--full')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function limaHour(base: Date, h: number, m: number): Date {
  return fromZonedTime(setMinutes(setHours(base, h), m), LIMA_TZ)
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()) })
  })
}

async function confirm(question: string): Promise<boolean> {
  const answer = await ask(question)
  return ['s', 'si', 'sí', 'y', 'yes'].includes(answer.toLowerCase())
}

function runScript(scriptPath: string, backendRoot: string, label: string): void {
  console.log(`🌱 Running ${label}...`)
  execSync(
    `npx ts-node -r tsconfig-paths/register ${scriptPath}`,
    { stdio: 'inherit', cwd: backendRoot },
  )
  console.log('')
}

// ─── Full reset ───────────────────────────────────────────────────────────────

async function fullReset(backendRoot: string): Promise<void> {
  console.log('⚠️  MODO COMPLETO — borrará TODO incluyendo SuperAdmin y todos los tenants.')
  console.log('')

  const ok = await confirm('¿Estás seguro? Escribe "si" para continuar: ')
  if (!ok) {
    console.log('\nCancelado. No se realizaron cambios.')
    return
  }
  console.log('')

  // 1. Wipe all tables in reverse dependency order (including platform_admins)
  console.log('🗑️  Clearing all data...')
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
  await prisma.platformAdmin.deleteMany()
  console.log('✅ All data cleared.')
  console.log('')

  // 2. seed.ts — Clínica San Rafael + rebased appointments
  runScript(path.join(backendRoot, 'prisma', 'seed.ts'), backendRoot, 'seed.ts (San Rafael)')

  // 3. seed-platform.ts — SuperAdmin account
  runScript(path.join(backendRoot, 'prisma', 'seed-platform.ts'), backendRoot, 'seed-platform.ts (SuperAdmin)')

  // 4. seed-demo-tenants.ts — 4 reference tenants
  runScript(path.join(backendRoot, 'prisma', 'seed-demo-tenants.ts'), backendRoot, 'seed-demo-tenants.ts (tenants 2–5)')

  // 5. Rebase San Rafael appointments to TODAY
  await rebaseAppointments()

  // 6. Summary
  await printSummary(true)
}

// ─── Normal reset (San Rafael only) ──────────────────────────────────────────

async function normalReset(backendRoot: string): Promise<void> {
  console.log('⚠️  Borrará todos los datos de Clínica San Rafael y restaurará desde seed.')
  console.log('   El SuperAdmin y los tenants 2–5 NO se tocan.')
  console.log('')

  const ok = await confirm('¿Estás seguro? Escribe "si" para continuar: ')
  if (!ok) {
    console.log('\nCancelado. No se realizaron cambios.')
    return
  }
  console.log('')

  // 1. Wipe all tenant data (no platform_admins)
  console.log('🗑️  Clearing all data...')
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
  console.log('✅ Data cleared.')
  console.log('')

  // 2. seed.ts — Clínica San Rafael
  runScript(path.join(backendRoot, 'prisma', 'seed.ts'), backendRoot, 'seed.ts (San Rafael)')

  // 3. Rebase appointments to TODAY
  await rebaseAppointments()

  // 4. Summary
  await printSummary(false)
}

// ─── Rebase appointments to TODAY ─────────────────────────────────────────────

async function rebaseAppointments(): Promise<void> {
  console.log('📅 Updating appointment dates to current week...')

  // Only rebase San Rafael appointments (seed.ts only created those)
  const appointments = await prisma.appointment.findMany({
    where: {
      deleted_at: null,
      tenant: { subdomain: 'sanrafael' },
    },
    orderBy: { scheduled_at: 'asc' },
  })

  const today = startOfDay(new Date())

  // Slot layout:
  //   [0–1]   2 confirmed today (visible in "Citas de hoy" KPI)
  //   [2–4]   3 appointments tomorrow (1 confirmed, 2 pending)
  //   [5–29]  25 future appointments spread over days 2–13
  //   [30+]   past — completed or cancelled

  const rebasedScheduledAt: { id: string; scheduled_at: Date }[] = []

  // Today
  const todayHours: [number, number][] = [[9, 0], [11, 0]]
  for (let i = 0; i < 2 && i < appointments.length; i++) {
    const scheduledAt = limaHour(today, todayHours[i][0], todayHours[i][1])
    await prisma.appointment.update({
      where: { id: appointments[i].id },
      data: { scheduled_at: scheduledAt, status: AppointmentStatus.confirmed, reminder_sent: true },
    })
    rebasedScheduledAt.push({ id: appointments[i].id, scheduled_at: scheduledAt })
  }

  // Tomorrow
  const tomorrowHours: [number, number][] = [[8, 30], [10, 30], [14, 0]]
  for (let i = 0; i < 3 && (i + 2) < appointments.length; i++) {
    const scheduledAt = limaHour(addDays(today, 1), tomorrowHours[i][0], tomorrowHours[i][1])
    await prisma.appointment.update({
      where: { id: appointments[i + 2].id },
      data: {
        scheduled_at: scheduledAt,
        status: i === 0 ? AppointmentStatus.confirmed : AppointmentStatus.pending,
        reminder_sent: true,
      },
    })
    rebasedScheduledAt.push({ id: appointments[i + 2].id, scheduled_at: scheduledAt })
  }

  // Future — days 2–13
  const futureAppts = appointments.slice(5, 30)
  for (let i = 0; i < futureAppts.length; i++) {
    const daysAhead   = Math.floor(i / 3) + 2
    const hour        = 8 + (i % 6) * 2
    const scheduledAt = limaHour(addDays(today, daysAhead), hour, 0)
    await prisma.appointment.update({
      where: { id: futureAppts[i].id },
      data: {
        scheduled_at: scheduledAt,
        status: i % 3 === 0 ? AppointmentStatus.confirmed : AppointmentStatus.pending,
        reminder_sent: false,
      },
    })
  }

  // Past
  const pastAppts = appointments.slice(30)
  for (let i = 0; i < pastAppts.length; i++) {
    const daysBack     = -(i + 1)
    const hour         = 9 + (i % 5) * 2
    const isCancelled  = i % 5 === 4
    const reminderSent = !isCancelled && i % 3 !== 2
    const scheduledAt  = limaHour(addDays(today, daysBack), hour, 0)
    await prisma.appointment.update({
      where: { id: pastAppts[i].id },
      data: {
        scheduled_at: scheduledAt,
        status: isCancelled ? AppointmentStatus.cancelled : AppointmentStatus.completed,
        reminder_sent: reminderSent,
      },
    })
    if (reminderSent) rebasedScheduledAt.push({ id: pastAppts[i].id, scheduled_at: scheduledAt })
  }

  // Recreate Reminder records with correct sent_at
  await prisma.reminder.deleteMany()
  const tenant = await prisma.tenant.findFirst({ where: { subdomain: 'sanrafael' } })
  if (tenant) {
    await prisma.reminder.createMany({
      data: rebasedScheduledAt.map(({ id: apptId, scheduled_at }) => ({
        id:             uuidv4(),
        tenant_id:      tenant.id,
        appointment_id: apptId,
        channel:        'whatsapp',
        status:         'sent',
        message:        'Recordatorio: tienes una cita en Clínica San Rafael mañana a la hora indicada. Ante cualquier consulta, escríbenos.',
        sent_at:        new Date(scheduled_at.getTime() - 24 * 60 * 60 * 1000),
      })),
    })
  }

  console.log('✅ Appointment dates updated.')
  console.log('')
}

// ─── Summary ──────────────────────────────────────────────────────────────────

async function printSummary(full: boolean): Promise<void> {
  const today = startOfDay(new Date())

  const [tenants, platformAdmins, users, doctors, patients, appts, consultations, invoices, services] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.platformAdmin.count(),
      prisma.user.count(),
      prisma.doctor.count(),
      prisma.patient.count(),
      prisma.appointment.count({ where: { deleted_at: null } }),
      prisma.consultation.count(),
      prisma.invoice.count(),
      prisma.serviceCatalog.count(),
    ])

  const todayCount = await prisma.appointment.count({
    where: {
      scheduled_at: { gte: today, lt: addDays(today, 1) },
      deleted_at: null,
      tenant: { subdomain: 'sanrafael' },
    },
  })

  console.log('================================')
  console.log(`✅ Demo reset ${full ? 'completo' : ''} completado!`)
  console.log('')
  if (full) {
    console.log(`   SuperAdmins:   ${platformAdmins} (superadmin@maosystems.io)`)
    console.log(`   Tenants:       ${tenants} (1 principal + 4 referencia)`)
  } else {
    console.log(`   Tenants:       ${tenants}`)
  }
  console.log(`   Users:         ${users}`)
  console.log(`   Doctors:       ${doctors}`)
  console.log(`   Patients:      ${patients} (San Rafael)`)
  console.log(`   Appointments:  ${appts} total (${todayCount} hoy en San Rafael)`)
  console.log(`   Consultations: ${consultations}`)
  console.log(`   Invoices:      ${invoices}`)
  console.log(`   Services:      ${services}`)
  console.log('')
  console.log('🔑 Credenciales principales:')
  console.log('   Tenant:   admin@sanrafael.maosystems.io / Demo2026!')
  if (full) {
    console.log('   Platform: superadmin@maosystems.io / SuperAdmin2026!')
    console.log('   URL:      https://demo.maosystems.io')
    console.log('   Admin:    https://demo.maosystems.io/platform/login')
  } else {
    console.log('   URL:      https://demo.maosystems.io')
  }
  console.log('================================')
  console.log('')
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? ''
  if (!dbUrl.includes('mao_dev') && !dbUrl.includes('mao_prod') && !dbUrl.includes('localhost')) {
    console.error('❌ DATABASE_URL no parece una base de datos MAO. Abortando.')
    console.error(`   DATABASE_URL: ${dbUrl.replace(/:\/\/[^@]+@/, '://<credentials>@')}`)
    process.exit(1)
  }

  const dbLabel = dbUrl.includes('mao_prod') ? 'mao_prod (PRODUCCIÓN)' : 'mao_dev (local)'
  const backendRoot = path.resolve(__dirname, '..', '..')

  console.log('')
  console.log('🔄 Clinova — Demo Reset')
  console.log('================================')
  console.log(`   Base de datos: ${dbLabel}`)
  console.log('')

  if (IS_FULL) {
    console.log('   Modo: COMPLETO (--full)')
    console.log('')
    await fullReset(backendRoot)
  } else {
    console.log('   Modo: Solo San Rafael (normal)')
    console.log('   Tip: usa --full para recrear todo desde cero.')
    console.log('')
    await normalReset(backendRoot)
  }
}

main()
  .catch(err => {
    console.error('❌ Reset failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
