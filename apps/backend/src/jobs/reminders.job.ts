import cron from 'node-cron'
import { formatInTimeZone } from 'date-fns-tz'
import { AppointmentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getWhatsAppProvider } from '@/lib/whatsapp/whatsapp.factory'
import type { WhatsAppMessageData } from '@/lib/whatsapp/whatsapp.interface'

const LIMA_TZ = 'America/Lima'

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function buildMessage(data: WhatsAppMessageData): string {
  const formatted = formatInTimeZone(data.scheduledAt, LIMA_TZ, "dd/MM/yyyy 'a las' HH:mm")
  return (
    `Hola ${data.patientName}, le recordamos su cita con ${data.doctorName} ` +
    `el ${formatted}. ` +
    `Por favor confirme su asistencia. — ${data.clinicName}`
  )
}

// Core job logic extracted so it can be called both by the cron and the test endpoint.
export async function runRemindersJob(): Promise<number> {
  const now         = new Date()
  const windowStart = addHours(now, 23)
  const windowEnd   = addHours(now, 25)

  const provider = getWhatsAppProvider()

  const tenants = await prisma.tenant.findMany({
    where:  { active: true },
    select: { id: true, name: true },
  })

  let count = 0

  for (const tenant of tenants) {
    const appointments = await prisma.appointment.findMany({
      where: {
        tenant_id:     tenant.id,
        scheduled_at:  { gte: windowStart, lte: windowEnd },
        status:        { in: [AppointmentStatus.pending, AppointmentStatus.confirmed] },
        reminder_sent: false,
        deleted_at:    null,
      },
      include: {
        patient: { select: { phone: true, first_name: true, last_name: true } },
        doctor:  { select: { user: { select: { first_name: true, last_name: true } } } },
      },
    })

    for (const appointment of appointments) {
      // Skip patients without a registered phone number
      if (!appointment.patient.phone) continue

      const patientName = `${appointment.patient.first_name} ${appointment.patient.last_name}`
      const doctorName  = `Dr. ${appointment.doctor.user.last_name}`

      const messageData: WhatsAppMessageData = {
        to:          `51${appointment.patient.phone}`,
        patientName,
        doctorName,
        scheduledAt: appointment.scheduled_at,
        clinicName:  tenant.name,
      }

      const result = await provider.send(messageData)

      await prisma.reminder.create({
        data: {
          tenant_id:      tenant.id,
          appointment_id: appointment.id,
          channel:        'whatsapp',
          status:         result.status,
          message:        buildMessage(messageData),
          sent_at:        new Date(),
          error_message:  result.error ?? null,
        },
      })

      await prisma.appointment.update({
        where: { id: appointment.id },
        data:  { reminder_sent: true },
      })

      count++
    }
  }

  console.log(`[Reminders] Processed ${count} reminders`)
  return count
}

export function startRemindersJob(): void {
  // Runs at the top of every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await runRemindersJob()
    } catch (err) {
      // Never throw — the cron must keep running even if a cycle fails
      console.error('[Reminders] Cron job error:', err)
    }
  })
}
