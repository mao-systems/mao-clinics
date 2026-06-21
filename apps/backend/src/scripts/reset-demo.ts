/**
 * Demo reset script — MAO Systems
 *
 * Wipes all data and re-seeds the demo tenant, then rebases all appointment
 * dates to TODAY so the calendar always looks current during client demos.
 *
 * Usage (local):  pnpm --filter backend demo:reset:local
 * Usage (EC2):    ~/reset-demo.sh   (which calls demo:reset)
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function limaHour(base: Date, h: number, m: number): Date {
  return fromZonedTime(setMinutes(setHours(base, h), m), LIMA_TZ)
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 's' || answer.toLowerCase() === 'si' || answer.toLowerCase() === 'sí')
    })
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function resetDemo(): Promise<void> {
  console.log('')
  console.log('🔄 MAO Systems — Demo Reset')
  console.log('================================')
  console.log('⚠️  This will DELETE all demo data and restore from seed.')
  console.log('')

  // Safety check — confirm the DATABASE_URL looks like a known database
  const dbUrl = process.env.DATABASE_URL ?? ''
  if (!dbUrl.includes('mao_dev') && !dbUrl.includes('mao_prod') && !dbUrl.includes('localhost')) {
    console.error('❌ DATABASE_URL does not look like a MAO database. Aborting.')
    console.error(`   Current DATABASE_URL: ${dbUrl.replace(/:\/\/[^@]+@/, '://<credentials>@')}`)
    process.exit(1)
  }

  const dbLabel = dbUrl.includes('mao_prod') ? 'mao_prod (PRODUCTION)' : 'mao_dev (local)'
  console.log(`   Database: ${dbLabel}`)
  console.log('')

  const ok = await confirm('¿Estás seguro? Esto borrará TODOS los datos de la demo. (s/N): ')
  if (!ok) {
    console.log('')
    console.log('Cancelado. No se realizaron cambios.')
    return
  }

  console.log('')

  // ── 1. Delete all data in reverse dependency order ────────────────────────
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

  // ── 2. Re-run seed ────────────────────────────────────────────────────────
  console.log('🌱 Running seed...')

  // Spawn ts-node on seed.ts in a child process — same as `pnpm db:seed`.
  // This avoids a rootDir violation (prisma/ is outside src/) while keeping
  // the seed file as the single source of truth.
  const backendRoot = path.resolve(__dirname, '..', '..')
  const seedPath    = path.join(backendRoot, 'prisma', 'seed.ts')
  execSync(
    `npx ts-node -r tsconfig-paths/register ${seedPath}`,
    { stdio: 'inherit', cwd: backendRoot },
  )

  console.log('')

  // ── 3. Rebase appointment dates to TODAY ──────────────────────────────────
  console.log('📅 Updating appointment dates to current week...')

  const appointments = await prisma.appointment.findMany({
    where: { deleted_at: null },
    orderBy: { scheduled_at: 'asc' },
  })

  const today = startOfDay(new Date())

  // Slot layout:
  //   [0–1]   2 confirmed today (visible in "Citas de hoy" KPI)
  //   [2–4]   3 appointments tomorrow (1 confirmed, 2 pending)
  //   [5–29]  25 future appointments spread over days 2–13
  //   [30+]   remainder become past — completed or cancelled

  // Today — 2 confirmed slots, reminder already sent (same-day)
  const todayAppts = appointments.slice(0, 2)
  const todayHours: [number, number][] = [[9, 0], [11, 0]]
  const rebasedScheduledAt: { id: string; scheduled_at: Date; reminder_sent: boolean }[] = []

  for (let i = 0; i < todayAppts.length; i++) {
    const scheduledAt = limaHour(today, todayHours[i][0], todayHours[i][1])
    await prisma.appointment.update({
      where: { id: todayAppts[i].id },
      data: { scheduled_at: scheduledAt, status: AppointmentStatus.confirmed, reminder_sent: true },
    })
    rebasedScheduledAt.push({ id: todayAppts[i].id, scheduled_at: scheduledAt, reminder_sent: true })
  }

  // Tomorrow — 3 slots, reminder sent today (24h before)
  const tomorrowAppts = appointments.slice(2, 5)
  const tomorrowHours: [number, number][] = [[8, 30], [10, 30], [14, 0]]
  for (let i = 0; i < tomorrowAppts.length; i++) {
    const scheduledAt = limaHour(addDays(today, 1), tomorrowHours[i][0], tomorrowHours[i][1])
    await prisma.appointment.update({
      where: { id: tomorrowAppts[i].id },
      data: {
        scheduled_at: scheduledAt,
        status: i === 0 ? AppointmentStatus.confirmed : AppointmentStatus.pending,
        reminder_sent: true,
      },
    })
    rebasedScheduledAt.push({ id: tomorrowAppts[i].id, scheduled_at: scheduledAt, reminder_sent: true })
  }

  // Future — days 2–13, reminder not yet sent
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

  // Past — one per day going backwards; every 5th cancelled, rest completed
  // Completed past appointments had reminders sent before their appointment (~70%)
  const pastAppts = appointments.slice(30)
  for (let i = 0; i < pastAppts.length; i++) {
    const daysBack    = -(i + 1)
    const hour        = 9 + (i % 5) * 2
    const isCancelled = i % 5 === 4
    const reminderSent = !isCancelled && i % 3 !== 2   // ~66% of completed have reminder
    const scheduledAt  = limaHour(addDays(today, daysBack), hour, 0)
    await prisma.appointment.update({
      where: { id: pastAppts[i].id },
      data: {
        scheduled_at: scheduledAt,
        status: isCancelled ? AppointmentStatus.cancelled : AppointmentStatus.completed,
        reminder_sent: reminderSent,
      },
    })
    if (reminderSent) rebasedScheduledAt.push({ id: pastAppts[i].id, scheduled_at: scheduledAt, reminder_sent: true })
  }

  // Recreate Reminder records with correct sent_at based on rebased scheduled_at
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

  // ── 4. Summary ────────────────────────────────────────────────────────────
  const [tenants, users, doctors, patients, appts, consultations, invoices, services] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.doctor.count(),
      prisma.patient.count(),
      prisma.appointment.count({ where: { deleted_at: null } }),
      prisma.consultation.count(),
      prisma.invoice.count(),
      prisma.serviceCatalog.count(),
    ])

  const todayCount  = await prisma.appointment.count({
    where: { scheduled_at: { gte: today, lt: addDays(today, 1) }, deleted_at: null },
  })

  console.log('================================')
  console.log('✅ Demo reset completed!')
  console.log('')
  console.log(`   Tenant:        ${tenants} (Clínica San Rafael)`)
  console.log(`   Users:         ${users} (1 admin, 3 médicos, 1 recepcionista)`)
  console.log(`   Doctors:       ${doctors}`)
  console.log(`   Patients:      ${patients}`)
  console.log(`   Appointments:  ${appts} (${todayCount} hoy, 3 mañana, resto próximos 14 días)`)
  console.log(`   Consultations: ${consultations}`)
  console.log(`   Invoices:      ${invoices}`)
  console.log(`   Services:      ${services}`)
  console.log('')
  console.log('🔑 Demo credentials:')
  console.log('   URL:      https://demo.maosystems.io')
  console.log('   Email:    admin@sanrafael.maosystems.io')
  console.log('   Password: Demo2026!')
  console.log('================================')
  console.log('')
}

resetDemo()
  .catch(err => {
    console.error('❌ Reset failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
