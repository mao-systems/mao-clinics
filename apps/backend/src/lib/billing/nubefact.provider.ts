import Decimal from 'decimal.js'
import { formatInTimeZone } from 'date-fns-tz'
import { env } from '@/config/env'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import type { IInvoiceProvider, InvoiceEmitData, InvoiceEmitResult } from './billing.interface'

const LIMA_TZ   = 'America/Lima'
const BASE_URL  = 'https://api.nubefact.com/api/v1'

// invoice type codes: boleta = 2, factura = 1
const TIPO_COMPROBANTE: Record<string, number> = { boleta: 2, factura: 1 }

// document type codes: DNI = 1, RUC = 6
const TIPO_DOC_DNI = 1
const TIPO_DOC_RUC = 6

export class NubefactProvider implements IInvoiceProvider {
  async emit(data: InvoiceEmitData): Promise<InvoiceEmitResult> {
    if (!env.NUBEFACT_TOKEN || !env.NUBEFACT_RUC) {
      throw new AppError(
        'NUBEFACT_NOT_CONFIGURED',
        500,
        'Nubefact no está configurado. Configure NUBEFACT_TOKEN y NUBEFACT_RUC.',
      )
    }

    const isFactura          = data.invoice.type === 'factura'
    const tipoDocCliente     = isFactura && data.invoice.customerRuc ? TIPO_DOC_RUC : TIPO_DOC_DNI
    const numDocCliente      = isFactura && data.invoice.customerRuc
      ? data.invoice.customerRuc
      : data.patient.dni
    const nombreCliente      = isFactura && data.invoice.customerName
      ? data.invoice.customerName
      : data.patient.fullName
    const fechaEmision       = formatInTimeZone(data.invoice.issuedAt, LIMA_TZ, 'dd-MM-yyyy')

    const body = {
      operacion:               'generar_comprobante',
      tipo_de_comprobante:     TIPO_COMPROBANTE[data.invoice.type],
      serie:                   data.invoice.series,
      numero:                  data.invoice.number,
      sunat_transaction:       1,
      cliente_tipo_de_documento: tipoDocCliente,
      cliente_numero_de_documento: numDocCliente,
      cliente_denominacion:    nombreCliente,
      cliente_direccion:       data.invoice.customerAddress ?? '',
      fecha_de_emision:        fechaEmision,
      moneda:                  1,   // 1 = Soles
      porcentaje_de_igv:       18,
      total_gravada:           data.invoice.subtotal.toFixed(2),
      total_igv:               data.invoice.tax.toFixed(2),
      total:                   data.invoice.total.toFixed(2),
      items: data.invoice.items.map((item) => {
        const valorUnitario = item.unit_price
        const precioUnitario = valorUnitario.mul('1.18').toDecimalPlaces(6)
        const subtotalItem  = valorUnitario.mul(item.quantity).toDecimalPlaces(2)
        const igvItem       = subtotalItem.mul('0.18').toDecimalPlaces(2)
        const totalItem     = subtotalItem.mul('1.18').toDecimalPlaces(2)
        return {
          unidad_de_medida: 'ZZ',
          codigo:           '',
          descripcion:      item.description,
          cantidad:         item.quantity,
          valor_unitario:   valorUnitario.toFixed(6),
          precio_unitario:  precioUnitario.toFixed(6),
          subtotal:         subtotalItem.toFixed(2),
          tipo_de_igv:      1,
          igv:              igvItem.toFixed(2),
          total:            totalItem.toFixed(2),
        }
      }),
    }

    // 1. Generate the invoice
    const emitRes = await fetch(`${BASE_URL}/${env.NUBEFACT_RUC}/invoices`, {
      method:  'POST',
      headers: {
        'Authorization': `Token ${env.NUBEFACT_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    })

    const nubefactResponse = await emitRes.json() as Record<string, unknown>

    if (!emitRes.ok) {
      logger.error('[Nubefact] emit failed', { status: emitRes.status, body: nubefactResponse })
      // SUNAT rejected — return with no PDF, caller will handle it
      return {
        sunat_status:    'rejected',
        pdf_buffer:      Buffer.alloc(0),
        sunat_response:  nubefactResponse,
      }
    }

    // 2. Download the PDF
    const pdfRes = await fetch(
      `${BASE_URL}/${env.NUBEFACT_RUC}/invoices/${data.invoice.series}-${data.invoice.number}/pdf`,
      {
        headers: { 'Authorization': `Token ${env.NUBEFACT_TOKEN}` },
      },
    )

    if (!pdfRes.ok) {
      logger.error('[Nubefact] PDF download failed', { status: pdfRes.status })
      // Invoice was accepted but PDF download failed — return accepted status with empty buffer
      return {
        sunat_status:   'accepted',
        pdf_buffer:     Buffer.alloc(0),
        sunat_response: nubefactResponse,
      }
    }

    const arrayBuffer = await pdfRes.arrayBuffer()
    const pdf_buffer  = Buffer.from(arrayBuffer)

    return {
      sunat_status:   'accepted',
      pdf_buffer,
      sunat_response: nubefactResponse,
    }
  }

  async cancel(invoiceId: string, reason: string): Promise<void> {
    if (!env.NUBEFACT_TOKEN || !env.NUBEFACT_RUC) {
      logger.error('[Nubefact] cancel called but provider not configured')
      return
    }

    try {
      const res = await fetch(`${BASE_URL}/${env.NUBEFACT_RUC}/invoices/${invoiceId}/void`, {
        method:  'POST',
        headers: {
          'Authorization': `Token ${env.NUBEFACT_TOKEN}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ motivo: reason }),
      })

      const body = await res.json()
      if (!res.ok) {
        logger.error('[Nubefact] cancel failed', { invoiceId, status: res.status, body })
      } else {
        logger.info('[Nubefact] cancel accepted', { invoiceId, body })
      }
    } catch (err) {
      logger.error('[Nubefact] cancel request threw', { invoiceId, err })
    }
  }
}
