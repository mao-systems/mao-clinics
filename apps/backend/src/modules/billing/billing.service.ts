import fs from 'fs'
import path from 'path'
import Decimal from 'decimal.js'
import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import { env } from '@/config/env'
import { getStorageProvider } from '@/lib/storage'
import { getBillingProvider } from '@/lib/billing/billing.factory'
import type { InvoiceEmitData } from '@/lib/billing/billing.interface'
import type { CreateInvoiceInput, BillingQueryInput } from './billing.schema'

export class BillingService {
  constructor(private readonly db: PrismaClient) {}

  // ── Create invoice (transaction — number assignment + DB write are atomic) ──
  async create(tenantId: string, data: CreateInvoiceInput) {
    const storage = getStorageProvider()
    const billing = getBillingProvider()

    const invoice = await this.db.$transaction(async (tx) => {
      // 1. Tenant (needed for PDF header)
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } })
      if (!tenant) throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant no encontrado')

      // 2. Patient must exist and belong to this tenant
      const patient = await tx.patient.findFirst({
        where: { id: data.patient_id, tenant_id: tenantId, deleted_at: null },
      })
      if (!patient) throw new AppError('PATIENT_NOT_FOUND', 404, 'Paciente no encontrado')

      // 3. Consultation (optional) must belong to this tenant
      if (data.consultation_id) {
        const consultation = await tx.consultation.findFirst({
          where: { id: data.consultation_id, tenant_id: tenantId },
        })
        if (!consultation) {
          throw new AppError('CONSULTATION_NOT_FOUND', 404, 'Consulta no encontrada')
        }
      }

      // 4. Determine series
      const series = data.type === 'boleta' ? 'B001' : 'F001'

      // 5. Sequential number — inside transaction to prevent race conditions
      const last = await tx.invoice.findFirst({
        where:   { tenant_id: tenantId, series },
        orderBy: { number: 'desc' },
        select:  { number: true },
      })
      const number = (last?.number ?? 0) + 1

      // 6. All money calculations via Decimal — never native JS floats
      const itemsWithAmounts = data.items.map((item) => {
        const unitPrice    = new Decimal(item.unit_price)
        const lineSubtotal = unitPrice.mul(item.quantity)
        return { ...item, unit_price: unitPrice, lineSubtotal }
      })
      const subtotal = itemsWithAmounts.reduce(
        (acc, item) => acc.add(item.lineSubtotal),
        new Decimal(0),
      )
      const tax   = subtotal.mul('0.18').toDecimalPlaces(2)
      const total = subtotal.add(tax)

      // 7. Build the emit payload
      const emitData: InvoiceEmitData = {
        tenant:  { name: tenant.name, ruc: tenant.ruc },
        patient: { fullName: `${patient.first_name} ${patient.last_name}`, dni: patient.dni },
        invoice: {
          type:    data.type,
          series,
          number,
          items:   itemsWithAmounts.map((i) => ({
            description: i.description,
            quantity:    i.quantity,
            unit_price:  i.unit_price,
          })),
          subtotal,
          tax,
          total,
          issuedAt:        new Date(),
          customerRuc:     data.customer_ruc,
          customerName:    data.customer_name,
          customerAddress: data.customer_address,
        },
      }

      // 8. Generate PDF via provider (mock or Nubefact)
      const { sunat_status, pdf_buffer, sunat_response } = await billing.emit(emitData)

      // 9. Upload PDF to storage
      let pdf_url: string | null = null
      if (pdf_buffer.length > 0) {
        const storageKey = `invoices/${tenantId}/${series}-${String(number).padStart(8, '0')}.pdf`
        // LocalStorageProvider reads file.buffer, so a minimal Multer.File-like object suffices
        const fakeFile = {
          buffer:      pdf_buffer,
          originalname: `${series}-${String(number).padStart(8, '0')}.pdf`,
          mimetype:    'application/pdf',
          size:        pdf_buffer.length,
          fieldname:   'pdf',
          encoding:    '7bit',
        } as Express.Multer.File
        pdf_url = await storage.upload(fakeFile, storageKey)
      }

      // 10. Persist invoice + items
      const created = await tx.invoice.create({
        data: {
          tenant_id:       tenantId,
          patient_id:      data.patient_id,
          consultation_id: data.consultation_id ?? null,
          type:            data.type,
          series,
          number,
          subtotal:        subtotal.toFixed(2),
          tax:             tax.toFixed(2),
          total:           total.toFixed(2),
          currency:        'PEN',
          sunat_status,
          sunat_response:  sunat_response ?? undefined,
          pdf_url,
          items: {
            create: itemsWithAmounts.map((item) => ({
              description: item.description,
              quantity:    item.quantity,
              unit_price:  item.unit_price.toFixed(2),
              total:       item.lineSubtotal.toFixed(2),
            })),
          },
        },
        include: {
          patient: { select: { first_name: true, last_name: true, dni: true } },
          items:   true,
        },
      })

      return created
    })

    return invoice
  }

  // ── List invoices (paginated) ─────────────────────────────────────────────────
  async findAll(tenantId: string, query: BillingQueryInput) {
    const where = {
      tenant_id: tenantId,
      ...(query.from || query.to
        ? {
            issued_at: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to   ? { lte: new Date(query.to)   } : {}),
            },
          }
        : {}),
      ...(query.type       ? { type:       query.type       } : {}),
      ...(query.patient_id ? { patient_id: query.patient_id } : {}),
    }

    const [data, total] = await Promise.all([
      this.db.invoice.findMany({
        where,
        include: {
          patient: { select: { first_name: true, last_name: true, dni: true } },
          items:   true,
        },
        orderBy: { issued_at: 'desc' },
        skip:    (query.page - 1) * query.limit,
        take:    query.limit,
      }),
      this.db.invoice.count({ where }),
    ])

    return {
      data,
      meta: {
        page:       query.page,
        limit:      query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }
  }

  // ── Single invoice ────────────────────────────────────────────────────────────
  async findById(tenantId: string, id: string) {
    const invoice = await this.db.invoice.findFirst({
      where:   { id, tenant_id: tenantId },
      include: {
        patient: { select: { first_name: true, last_name: true, dni: true } },
        items:   true,
      },
    })
    if (!invoice) throw new AppError('INVOICE_NOT_FOUND', 404, 'Comprobante no encontrado')
    return invoice
  }

  // ── Stream PDF buffer ─────────────────────────────────────────────────────────
  async getPdf(tenantId: string, id: string): Promise<Buffer> {
    const invoice = await this.findById(tenantId, id)

    if (invoice.pdf_url) {
      // URL format: {BACKEND_URL}/uploads/{key} — extract the key
      const key      = invoice.pdf_url.replace(`${env.BACKEND_URL}/uploads/`, '')
      const filePath = path.join(process.cwd(), 'uploads', key)
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath)
      }
    }

    throw new AppError('PDF_NOT_FOUND', 404, 'El PDF del comprobante no está disponible')
  }

  // ── Summary stats for the billing dashboard header ────────────────────────────
  async getSummary(tenantId: string, from: Date, to: Date) {
    const where = { tenant_id: tenantId, issued_at: { gte: from, lte: to } }

    const [aggregate, grouped] = await Promise.all([
      this.db.invoice.aggregate({
        where,
        _count: { id: true },
        _sum:   { total: true, tax: true },
      }),
      this.db.invoice.groupBy({
        by:    ['type'],
        where,
        _count: { id: true },
      }),
    ])

    const boletaCount  = grouped.find((g) => g.type === 'boleta')?._count.id  ?? 0
    const facturaCount = grouped.find((g) => g.type === 'factura')?._count.id ?? 0

    return {
      total_invoices: aggregate._count.id,
      total_boletas:  boletaCount,
      total_facturas: facturaCount,
      total_amount:   new Decimal(aggregate._sum.total?.toString() ?? '0'),
      total_tax:      new Decimal(aggregate._sum.tax?.toString()   ?? '0'),
    }
  }

  // ── Cancel invoice ────────────────────────────────────────────────────────────
  async cancel(tenantId: string, id: string, reason: string) {
    const invoice = await this.findById(tenantId, id)

    if (invoice.sunat_status === 'cancelled') {
      throw new AppError('INVOICE_ALREADY_CANCELLED', 409, 'El comprobante ya fue anulado')
    }

    // Only SUNAT-accepted invoices need a real void call; mock invoices just update the DB
    if (invoice.sunat_status === 'accepted') {
      const billing = getBillingProvider()
      await billing.cancel(id, reason)
    }

    const updated = await this.db.invoice.update({
      where: { id },
      data:  { sunat_status: 'cancelled' },
      include: {
        patient: { select: { first_name: true, last_name: true, dni: true } },
        items:   true,
      },
    })

    return updated
  }
}

export const billingService = new BillingService(prisma)
