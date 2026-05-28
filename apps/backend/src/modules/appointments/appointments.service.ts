import { PrismaClient, Prisma, AppointmentStatus } from '@prisma/client'
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz'

// Inline helper — avoids adding date-fns as a direct backend dependency
const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60 * 1000)
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import type {
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentQuery,
} from './appointments.schema'

const LIMA_TZ = 'America/Lima'

// Working hours in Lima local time
const WORK_START_HOUR = 8   // 08:00
const WORK_END_HOUR   = 20  // 20:00

// Valid status transitions — enforced strictly
const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending:     ['confirmed',   'cancelled']              as AppointmentStatus[],
  confirmed:   ['in_progress', 'cancelled']              as AppointmentStatus[],
  in_progress: ['completed',   'cancelled']              as AppointmentStatus[],
  completed:   ['no_show']                               as AppointmentStatus[],
  cancelled:   []                                        as AppointmentStatus[],
  no_show:     []                                        as AppointmentStatus[],
}

// Reusable include shape for list queries — minimal patient + doctor data
const LIST_INCLUDE = {
  patient: {
    select: { id: true, first_name: true, last_name: true, dni: true },
  },
  doctor: {
    select: {
      id: true,
      specialty: true,
      user: { select: { first_name: true, last_name: true } },
    },
  },
} satisfies Prisma.AppointmentInclude

// Full include shape for detail queries
const DETAIL_INCLUDE = {
  patient: true,
  doctor: { include: { user: true } },
  consultation: true,
} satisfies Prisma.AppointmentInclude

export class AppointmentsService {
  constructor(private readonly db: PrismaClient) {}

  // ── findAll ────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: AppointmentQuery) {
    const { from, to, doctor_id, patient_id, status, page, limit } = query
    const skip = (page - 1) * limit

    const where: Prisma.AppointmentWhereInput = {
      tenant_id:  tenantId,
      deleted_at: null,
    }

    if (from || to) {
      where.scheduled_at = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to   ? { lte: new Date(to)   } : {}),
      }
    }

    if (doctor_id)  where.doctor_id  = doctor_id
    if (patient_id) where.patient_id = patient_id
    if (status)     where.status     = status

    const [appointments, total] = await Promise.all([
      this.db.appointment.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { scheduled_at: 'asc' },
        skip,
        take: limit,
      }),
      this.db.appointment.count({ where }),
    ])

    return {
      data: appointments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  // ── findById ───────────────────────────────────────────────────────────────

  async findById(tenantId: string, id: string) {
    const appointment = await this.db.appointment.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
      include: DETAIL_INCLUDE,
    })

    if (!appointment) {
      throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Cita no encontrada')
    }

    return appointment
  }

  // ── getAvailability ────────────────────────────────────────────────────────

  async getAvailability(
    tenantId: string,
    doctorId: string,
    dateStr: string,
    durationMin: number,
  ) {
    // Verify doctor exists and belongs to tenant
    const doctor = await this.db.doctor.findFirst({
      where: { id: doctorId, tenant_id: tenantId, active: true },
    })

    if (!doctor) {
      throw new AppError('DOCTOR_NOT_FOUND', 404, 'Médico no encontrado')
    }

    // Build UTC day boundaries from Lima local date string "YYYY-MM-DD"
    // fromZonedTime treats the given date/time string as being in the specified timezone
    const workStartUtc = fromZonedTime(`${dateStr}T${String(WORK_START_HOUR).padStart(2, '0')}:00:00`, LIMA_TZ)
    const workEndUtc   = fromZonedTime(`${dateStr}T${String(WORK_END_HOUR).padStart(2, '0')}:00:00`, LIMA_TZ)
    // Full day boundaries for the appointment query
    const dayStartUtc  = fromZonedTime(`${dateStr}T00:00:00`, LIMA_TZ)
    const dayEndUtc    = fromZonedTime(`${dateStr}T23:59:59`, LIMA_TZ)

    // Fetch all non-cancelled appointments for this doctor on this day
    const existing = await this.db.appointment.findMany({
      where: {
        doctor_id:  doctorId,
        tenant_id:  tenantId,
        deleted_at: null,
        status:     { notIn: ['cancelled', 'no_show'] },
        scheduled_at: { gte: dayStartUtc, lte: dayEndUtc },
      },
      select: { scheduled_at: true, duration_min: true },
    })

    // Generate every possible slot and mark occupied/available in JavaScript
    // (existing appointments already fetched — no extra DB calls per slot)
    const slots: Array<{ time: string; scheduled_at: string; available: boolean }> = []
    let current = workStartUtc

    while (current < workEndUtc) {
      const slotEnd = addMinutes(current, durationMin)

      // Slot must finish within working hours
      if (slotEnd > workEndUtc) break

      const isOccupied = existing.some((appt) => {
        const apptStart = appt.scheduled_at
        const apptEnd   = addMinutes(apptStart, appt.duration_min)
        // Standard interval overlap: start < otherEnd && end > otherStart
        return current < apptEnd && slotEnd > apptStart
      })

      slots.push({
        time:         formatInTimeZone(current, LIMA_TZ, 'HH:mm'),
        scheduled_at: current.toISOString(),
        available:    !isOccupied,
      })

      current = addMinutes(current, durationMin)
    }

    return slots
  }

  // ── checkOverlap ───────────────────────────────────────────────────────────
  // Uses a raw PostgreSQL query so the overlap condition on duration_min
  // (a per-row computed end-time) stays in the database, not JavaScript.

  async checkOverlap(
    tenantId:    string,
    doctorId:    string,
    scheduledAt: Date,
    durationMin: number,
    excludeId?:  string,
  ): Promise<void> {
    const newEnd = addMinutes(scheduledAt, durationMin)

    // Prisma maps String fields to TEXT in PostgreSQL — no ::uuid cast needed.
    // Date parameters are bound as TIMESTAMP by node-postgres natively.
    const rows = excludeId
      ? await this.db.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) AS count
          FROM appointments
          WHERE tenant_id  = ${tenantId}
            AND doctor_id  = ${doctorId}
            AND id        != ${excludeId}
            AND status NOT IN ('cancelled', 'no_show')
            AND deleted_at IS NULL
            AND scheduled_at < ${newEnd}
            AND scheduled_at + duration_min * INTERVAL '1 minute' > ${scheduledAt}`
      : await this.db.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) AS count
          FROM appointments
          WHERE tenant_id = ${tenantId}
            AND doctor_id = ${doctorId}
            AND status NOT IN ('cancelled', 'no_show')
            AND deleted_at IS NULL
            AND scheduled_at < ${newEnd}
            AND scheduled_at + duration_min * INTERVAL '1 minute' > ${scheduledAt}`

    if (Number(rows[0].count) > 0) {
      throw new AppError(
        'TIME_SLOT_TAKEN',
        409,
        'El médico ya tiene una cita en ese horario',
      )
    }
  }

  // ── create ─────────────────────────────────────────────────────────────────

  async create(tenantId: string, data: CreateAppointmentData) {
    // Verify patient belongs to tenant
    const patient = await this.db.patient.findFirst({
      where: { id: data.patient_id, tenant_id: tenantId, deleted_at: null },
    })
    if (!patient) {
      throw new AppError('PATIENT_NOT_FOUND', 404, 'Paciente no encontrado')
    }

    // Verify doctor belongs to tenant
    const doctor = await this.db.doctor.findFirst({
      where: { id: data.doctor_id, tenant_id: tenantId, active: true },
    })
    if (!doctor) {
      throw new AppError('DOCTOR_NOT_FOUND', 404, 'Médico no encontrado')
    }

    const scheduledAt = new Date(data.scheduled_at)
    const durationMin = data.duration_min ?? 30

    await this.checkOverlap(tenantId, data.doctor_id, scheduledAt, durationMin)

    return this.db.appointment.create({
      data: {
        tenant_id:    tenantId,
        patient_id:   data.patient_id,
        doctor_id:    data.doctor_id,
        scheduled_at: scheduledAt,
        duration_min: durationMin,
        reason:       data.reason ?? null,
        notes:        data.notes  ?? null,
      },
      include: LIST_INCLUDE,
    })
  }

  // ── update ─────────────────────────────────────────────────────────────────

  async update(tenantId: string, id: string, data: UpdateAppointmentData) {
    const existing = await this.findById(tenantId, id)

    // Recalculate effective values (existing fallback for unchanged fields)
    const scheduledAt = data.scheduled_at ? new Date(data.scheduled_at) : existing.scheduled_at
    const durationMin = data.duration_min  !== undefined ? data.duration_min : existing.duration_min
    const doctorId    = data.doctor_id     ?? existing.doctor_id

    // Only run the overlap check if something time-related changed
    const timeChanged =
      data.scheduled_at !== undefined ||
      data.duration_min !== undefined ||
      data.doctor_id    !== undefined

    if (timeChanged) {
      await this.checkOverlap(tenantId, doctorId, scheduledAt, durationMin, id)
    }

    return this.db.appointment.update({
      where:   { id },
      data: {
        patient_id:   data.patient_id,
        doctor_id:    data.doctor_id,
        scheduled_at: data.scheduled_at ? new Date(data.scheduled_at) : undefined,
        duration_min: data.duration_min,
        reason:       data.reason,
        notes:        data.notes,
      },
      include: LIST_INCLUDE,
    })
  }

  // ── updateStatus ───────────────────────────────────────────────────────────

  async updateStatus(
    tenantId:        string,
    id:              string,
    status:          AppointmentStatus,
    cancelledReason?: string,
  ) {
    const appointment = await this.db.appointment.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
    })

    if (!appointment) {
      throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Cita no encontrada')
    }

    const allowed = VALID_TRANSITIONS[appointment.status]
    if (!allowed.includes(status)) {
      throw new AppError(
        'INVALID_STATUS_TRANSITION',
        400,
        `No se puede cambiar el estado de "${appointment.status}" a "${status}"`,
      )
    }

    return this.db.appointment.update({
      where: { id },
      data: {
        status,
        cancelled_reason:
          status === 'cancelled' ? (cancelledReason ?? null) : undefined,
      },
      include: LIST_INCLUDE,
    })
  }

  // ── softDelete ─────────────────────────────────────────────────────────────
  // Cancelling is the soft-delete for appointments — data is never hard-deleted.

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.updateStatus(tenantId, id, 'cancelled', 'Eliminada por el administrador')
  }
}

export const appointmentsService = new AppointmentsService(prisma)
