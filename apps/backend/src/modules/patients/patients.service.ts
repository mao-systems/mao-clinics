import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import type { CreatePatientData, UpdatePatientData, PatientQuery } from './patients.schema'

interface PaginatedPatients {
  data: Awaited<ReturnType<PrismaClient['patient']['findMany']>>
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class PatientsService {
  constructor(private readonly db: PrismaClient) {}

  async findAll(tenantId: string, query: PatientQuery): Promise<PaginatedPatients> {
    const { q, district, page, limit } = query
    const skip = (page - 1) * limit

    const where: Prisma.PatientWhereInput = {
      tenant_id: tenantId,
      deleted_at: null,
    }

    if (q) {
      where.OR = [
        { first_name: { contains: q, mode: 'insensitive' } },
        { last_name: { contains: q, mode: 'insensitive' } },
        { dni: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (district) {
      where.district = { equals: district, mode: 'insensitive' }
    }

    const [patients, total] = await Promise.all([
      this.db.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.db.patient.count({ where }),
    ])

    return {
      data: patients,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findById(tenantId: string, id: string) {
    const patient = await this.db.patient.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
    })

    if (!patient) {
      throw new AppError('PATIENT_NOT_FOUND', 404, 'Paciente no encontrado')
    }

    return patient
  }

  async getHistory(tenantId: string, patientId: string) {
    // Verify patient exists and belongs to this tenant before fetching history
    const patient = await this.findById(tenantId, patientId)

    const [appointments, invoices] = await Promise.all([
      this.db.appointment.findMany({
        where: { patient_id: patientId, tenant_id: tenantId },
        include: {
          consultation: {
            include: { prescriptions: { include: { items: true } } },
          },
          doctor: { include: { user: true } },
        },
        orderBy: { scheduled_at: 'desc' },
      }),
      this.db.invoice.findMany({
        where: { patient_id: patientId, tenant_id: tenantId },
        include: { items: true },
        orderBy: { issued_at: 'desc' },
      }),
    ])

    return { patient, appointments, invoices }
  }

  async create(tenantId: string, data: CreatePatientData) {
    const existing = await this.db.patient.findFirst({
      where: { tenant_id: tenantId, dni: data.dni, deleted_at: null },
    })

    if (existing) {
      throw new AppError('DNI_ALREADY_EXISTS', 409, 'Ya existe un paciente con ese DNI')
    }

    const patient = await this.db.patient.create({
      data: {
        ...data,
        date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : null,
        tenant_id: tenantId,
      },
    })

    return patient
  }

  async update(tenantId: string, id: string, data: UpdatePatientData) {
    const existing = await this.findById(tenantId, id)

    // Only check DNI uniqueness when it changed
    if (data.dni && data.dni !== existing.dni) {
      const conflict = await this.db.patient.findFirst({
        where: { tenant_id: tenantId, dni: data.dni, deleted_at: null },
      })

      if (conflict) {
        throw new AppError('DNI_ALREADY_EXISTS', 409, 'Ya existe un paciente con ese DNI')
      }
    }

    const patient = await this.db.patient.update({
      where: { id },
      data: {
        ...data,
        date_of_birth:
          data.date_of_birth !== undefined
            ? data.date_of_birth
              ? new Date(data.date_of_birth)
              : null
            : undefined,
      },
    })

    return patient
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.findById(tenantId, id)

    await this.db.patient.update({
      where: { id },
      data: { deleted_at: new Date() },
    })
  }
}

export const patientsService = new PatientsService(prisma)
