import { PrismaClient, Prisma } from '@prisma/client'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import { getStorageProvider } from '@/lib/storage'
import { pdfService } from '@/lib/pdf.service'
import type {
  CreateConsultationData,
  UpdateConsultationData,
  CreatePrescriptionData,
  RecordsQuery,
} from './records.schema'

// Appointment statuses that allow a consultation to be created
const ALLOWED_CREATE_STATUSES = ['confirmed', 'in_progress']

// Minimal include for list queries
const LIST_INCLUDE = {
  appointment: {
    select: {
      id:           true,
      scheduled_at: true,
      status:       true,
      patient: {
        select: { id: true, first_name: true, last_name: true, dni: true },
      },
      doctor: {
        select: {
          id:        true,
          specialty: true,
          user: { select: { first_name: true, last_name: true } },
        },
      },
    },
  },
  prescriptions: {
    include: { items: true },
    orderBy: { issued_at: 'desc' as const },
  },
} satisfies Prisma.ConsultationInclude

// Full include for detail queries (includes invoices)
const DETAIL_INCLUDE = {
  ...LIST_INCLUDE,
  invoices: true,
} satisfies Prisma.ConsultationInclude

export class RecordsService {
  constructor(private readonly db: PrismaClient) {}

  // ── findAll ────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: RecordsQuery) {
    const { from, to, doctor_id, patient_id, appointment_id, page, limit } = query
    const skip = (page - 1) * limit

    const where: Prisma.ConsultationWhereInput = {
      tenant_id: tenantId,
    }

    if (from || to) {
      where.created_at = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to   ? { lte: new Date(to)   } : {}),
      }
    }

    // appointment_id is the most specific filter — takes precedence
    if (appointment_id) {
      where.appointment_id = appointment_id
    } else {
      // Build appointment relationship filter from doctor_id + patient_id
      const apptFilter: Prisma.AppointmentWhereInput = {}
      if (doctor_id)  apptFilter.doctor_id  = doctor_id
      if (patient_id) apptFilter.patient_id = patient_id
      if (Object.keys(apptFilter).length > 0) {
        where.appointment = apptFilter
      }
    }

    const [consultations, total] = await Promise.all([
      this.db.consultation.findMany({
        where,
        include:  LIST_INCLUDE,
        orderBy:  { created_at: 'desc' },
        skip,
        take:     limit,
      }),
      this.db.consultation.count({ where }),
    ])

    return {
      data: consultations,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  // ── findById ───────────────────────────────────────────────────────────────

  async findById(tenantId: string, id: string) {
    const consultation = await this.db.consultation.findFirst({
      where:   { id, tenant_id: tenantId },
      include: DETAIL_INCLUDE,
    })

    if (!consultation) {
      throw new AppError('CONSULTATION_NOT_FOUND', 404, 'Consulta no encontrada')
    }

    return consultation
  }

  // ── create ─────────────────────────────────────────────────────────────────

  async create(tenantId: string, data: CreateConsultationData) {
    // Verify appointment belongs to tenant and is in an allowed status
    const appointment = await this.db.appointment.findFirst({
      where: { id: data.appointment_id, tenant_id: tenantId, deleted_at: null },
    })

    if (!appointment) {
      throw new AppError('APPOINTMENT_NOT_FOUND', 404, 'Cita no encontrada')
    }

    if (!ALLOWED_CREATE_STATUSES.includes(appointment.status)) {
      throw new AppError(
        'APPOINTMENT_NOT_READY',
        400,
        `No se puede crear una consulta para una cita con estado "${appointment.status}". La cita debe estar confirmada o en curso.`,
      )
    }

    // Prevent duplicate consultation for the same appointment
    const existing = await this.db.consultation.findUnique({
      where: { appointment_id: data.appointment_id },
    })

    if (existing) {
      throw new AppError(
        'CONSULTATION_ALREADY_EXISTS',
        409,
        'Esta cita ya tiene una consulta registrada',
      )
    }

    // Create consultation and move appointment to in_progress in a transaction
    const consultation = await this.db.$transaction(async (tx) => {
      const created = await tx.consultation.create({
        data: {
          tenant_id:         tenantId,
          appointment_id:    data.appointment_id,
          chief_complaint:   data.chief_complaint,
          physical_exam:     data.physical_exam    ?? null,
          diagnosis:         data.diagnosis        ?? null,
          icd10_code:        data.icd10_code       ?? null,
          icd10_description: data.icd10_description ?? null,
          treatment:         data.treatment        ?? null,
          notes:             data.notes            ?? null,
          follow_up_date:    data.follow_up_date   ? new Date(data.follow_up_date) : null,
        },
        include: LIST_INCLUDE,
      })

      // Auto-advance to in_progress if still confirmed
      if (appointment.status === 'confirmed') {
        await tx.appointment.update({
          where: { id: data.appointment_id },
          data:  { status: 'in_progress' },
        })
      }

      return created
    })

    return consultation
  }

  // ── update ─────────────────────────────────────────────────────────────────

  async update(tenantId: string, id: string, data: UpdateConsultationData) {
    // Verify ownership before updating
    await this.findById(tenantId, id)

    return this.db.consultation.update({
      where:   { id },
      data: {
        chief_complaint:   data.chief_complaint,
        physical_exam:     data.physical_exam,
        diagnosis:         data.diagnosis,
        icd10_code:        data.icd10_code,
        icd10_description: data.icd10_description,
        treatment:         data.treatment,
        notes:             data.notes,
        follow_up_date:    data.follow_up_date ? new Date(data.follow_up_date) : undefined,
      },
      include: DETAIL_INCLUDE,
    })
  }

  // ── complete ───────────────────────────────────────────────────────────────
  // Marks the parent appointment as completed.

  async complete(tenantId: string, id: string) {
    const consultation = await this.findById(tenantId, id)
    const appointment  = consultation.appointment

    if (appointment.status !== 'in_progress') {
      throw new AppError(
        'APPOINTMENT_NOT_IN_PROGRESS',
        400,
        `No se puede completar una consulta cuya cita tiene estado "${appointment.status}"`,
      )
    }

    await this.db.appointment.update({
      where: { id: appointment.id },
      data:  { status: 'completed' },
    })

    return this.findById(tenantId, id)
  }

  // ── createPrescription ─────────────────────────────────────────────────────

  async createPrescription(
    tenantId:       string,
    consultationId: string,
    data:           CreatePrescriptionData,
  ) {
    // Verify consultation ownership
    await this.findById(tenantId, consultationId)

    return this.db.prescription.create({
      data: {
        tenant_id:       tenantId,
        consultation_id: consultationId,
        instructions:    data.instructions ?? null,
        items: {
          createMany: {
            data: data.items.map((item) => ({
              medication:    item.medication,
              dosage:        item.dosage,
              frequency:     item.frequency,
              duration_days: item.duration_days,
              notes:         item.notes ?? null,
            })),
          },
        },
      },
      include: { items: true },
    })
  }

  // ── getPrescriptionPdf ─────────────────────────────────────────────────────

  async getPrescriptionPdf(
    tenantId:       string,
    consultationId: string,
    prescriptionId: string,
  ): Promise<Buffer> {
    const consultation = await this.findById(tenantId, consultationId)

    const prescription = consultation.prescriptions.find((p) => p.id === prescriptionId)

    if (!prescription) {
      throw new AppError('PRESCRIPTION_NOT_FOUND', 404, 'Receta no encontrada')
    }

    // Resolve tenant for clinic header info
    const tenant = await this.db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, ruc: true },
    })

    if (!tenant) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Clínica no encontrada')
    }

    const appt   = consultation.appointment
    const doctor = appt.doctor
    const patient = appt.patient

    return pdfService.generatePrescriptionPdf({
      prescriptionId,
      issuedAt:        prescription.issued_at,
      clinicName:      tenant.name,
      clinicRuc:       tenant.ruc,
      doctorName:      `${doctor.user.first_name} ${doctor.user.last_name}`,
      doctorSpecialty: doctor.specialty,
      doctorCmp:       null, // cmp resolved in full doctor record if needed
      patientName:     `${patient.last_name}, ${patient.first_name}`,
      patientDni:      patient.dni,
      patientDob:      null,
      instructions:    prescription.instructions,
      items:           prescription.items,
    })
  }

  // ── uploadAttachment ───────────────────────────────────────────────────────

  async uploadAttachment(
    tenantId:       string,
    consultationId: string,
    file:           Express.Multer.File,
  ) {
    const consultation = await this.findById(tenantId, consultationId)

    const ext      = path.extname(file.originalname).toLowerCase()
    const key      = `attachments/${tenantId}/${consultationId}/${Date.now()}${ext}`
    const provider = getStorageProvider()
    const url      = await provider.upload(file, key)

    const existingAttachments = Array.isArray(consultation.attachments)
      ? (consultation.attachments as Array<{ name: string; url: string; size: number; uploadedAt: string }>)
      : []

    const updated = await this.db.consultation.update({
      where: { id: consultationId },
      data: {
        attachments: [
          ...existingAttachments,
          {
            name:       file.originalname,
            url,
            size:       file.size,
            uploadedAt: new Date().toISOString(),
          },
        ],
      },
      include: DETAIL_INCLUDE,
    })

    return updated
  }
}

export const recordsService = new RecordsService(prisma)
