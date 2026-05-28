import type { EventInput } from '@fullcalendar/core'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/es'
import { STATUS_COLORS, VALID_TRANSITIONS } from '../constants/appointments.constants'
import type { AppointmentStatus } from '../constants/appointments.constants'
import type { AppointmentWithRelations } from '../hooks/useAppointments'

dayjs.extend(utc)
dayjs.extend(timezone)

const LIMA_TZ = 'America/Lima'

export function appointmentToCalendarEvent(
  appointment: AppointmentWithRelations,
): EventInput {
  const endUtc = dayjs(appointment.scheduled_at)
    .add(appointment.duration_min, 'minute')
    .toISOString()

  const colors = STATUS_COLORS[appointment.status as AppointmentStatus] ?? STATUS_COLORS.pending

  return {
    id: appointment.id,
    title: `${appointment.patient.last_name}, ${appointment.patient.first_name}`,
    start: appointment.scheduled_at,
    end: endUtc,
    backgroundColor: colors.bg,
    borderColor: colors.bg,
    textColor: colors.text,
    extendedProps: { appointment },
  }
}

/** Formats a UTC ISO timestamp as Lima local time in Spanish. */
export function formatAppointmentTime(scheduledAt: string): string {
  return dayjs(scheduledAt).tz(LIMA_TZ).locale('es').format('ddd D MMM · HH:mm')
}

/** Lima local date string (YYYY-MM-DD) from a UTC ISO timestamp. */
export function toLimaDate(utcIso: string): string {
  return dayjs(utcIso).tz(LIMA_TZ).format('YYYY-MM-DD')
}

/** Formats a Lima local date range for the calendar header. */
export function formatWeekRange(from: Date, to: Date): string {
  const start = dayjs(from).tz(LIMA_TZ).locale('es')
  // FullCalendar's `to` is exclusive (end of week = start of next week), subtract 1 day
  const end = dayjs(to).subtract(1, 'day').tz(LIMA_TZ).locale('es')

  if (start.month() === end.month()) {
    return `${start.date()} – ${end.format('D MMMM YYYY')}`
  }
  return `${start.format('D MMM')} – ${end.format('D MMM YYYY')}`
}

export function getNextValidStatuses(currentStatus: string): AppointmentStatus[] {
  return VALID_TRANSITIONS[currentStatus as AppointmentStatus] ?? []
}

export function getDoctorFullName(doctor: {
  user: { first_name: string; last_name: string }
}): string {
  return `Dr. ${doctor.user.last_name}`
}
