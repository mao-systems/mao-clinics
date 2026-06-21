import crypto from 'crypto'
import PDFDocument from 'pdfkit'
import Decimal from 'decimal.js'
import QRCode from 'qrcode'
import { formatInTimeZone } from 'date-fns-tz'
import type { IInvoiceProvider, InvoiceEmitData, InvoiceEmitResult } from './billing.interface'

const LIMA_TZ = 'America/Lima'

// ── Layout constants (A4 = 595 × 842 pt) ──────────────────────────────────────
const PAGE_W  = 595
const PAGE_H  = 842
const LEFT    = 60
const RIGHT   = 535
const USABLE  = 475

// Column widths for the items table
const COL_NUM   = 25
const COL_DESC  = 210
const COL_QTY   = 55
const COL_PRICE = 90
const COL_TOTAL = 95

// Brand colours
const COLOR_PRIMARY  = '#1A5F9E'
const COLOR_DARK     = '#1A2740'
const COLOR_GRAY     = '#555555'
const COLOR_LIGHT_BG = '#F5F7FA'
const COLOR_BORDER   = '#D0D8E4'
const COLOR_TABLE_H  = '#E8EDF4'

function fmtMoney(d: Decimal): string {
  return `S/ ${d.toFixed(2)}`
}

function fmtDate(date: Date): string {
  return formatInTimeZone(date, LIMA_TZ, 'dd/MM/yyyy')
}

function drawHRule(doc: PDFKit.PDFDocument, y: number) {
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke()
}

// ── Build CDR hash from invoice data (deterministic per invoice) ──────────────
function buildHash(ruc: string, series: string, number: number, total: Decimal): string {
  return crypto
    .createHash('sha256')
    .update(`${ruc}|${series}|${String(number).padStart(8, '0')}|${total.toFixed(2)}|MAOSYSTEMS`)
    .digest('base64')
}

// ── SUNAT QR content format ───────────────────────────────────────────────────
// Format: RUC|TipoDoc|Serie|Correlativo|MontoIGV|ImporteTotal|FechaEmision|TipoDocCliente|NumDocCliente
function buildQrContent(data: InvoiceEmitData): string {
  const docTypeCode   = data.invoice.type === 'factura' ? '01' : '03'
  const clientDocType = data.invoice.type === 'factura' ? '6' : '1'  // 6=RUC, 1=DNI
  const clientDocNum  = data.invoice.type === 'factura'
    ? (data.invoice.customerRuc ?? data.patient.dni)
    : data.patient.dni
  const paddedNum     = String(data.invoice.number).padStart(8, '0')
  const dateStr       = formatInTimeZone(data.invoice.issuedAt, LIMA_TZ, 'dd/MM/yyyy')

  return [
    data.tenant.ruc,
    docTypeCode,
    data.invoice.series,
    paddedNum,
    data.invoice.tax.toFixed(2),
    data.invoice.total.toFixed(2),
    dateStr,
    clientDocType,
    clientDocNum,
  ].join('|')
}

// ── Build realistic Nubefact CDR response ─────────────────────────────────────
function buildCdrResponse(data: InvoiceEmitData, hash: string): object {
  const docTypeCode = data.invoice.type === 'factura' ? '01' : '03'
  const paddedNum   = String(data.invoice.number).padStart(8, '0')
  const typeLabel   = data.invoice.type === 'factura' ? 'Factura' : 'Boleta de Venta'

  return {
    estado:    1,
    nroTicket: '',
    cdrResponse: {
      id:          `CDR-${data.tenant.ruc}-${docTypeCode}-${data.invoice.series}-${paddedNum}`,
      codigo:      '0',
      descripcion: `La ${typeLabel} número ${data.invoice.series}-${paddedNum} ha sido aceptada`,
      notas:       [],
      reglas:      [],
    },
    aceptadaConObservaciones: false,
    observaciones:            [],
    hash,
    fechaEmision: formatInTimeZone(data.invoice.issuedAt, LIMA_TZ, 'yyyy-MM-dd'),
    moneda:       'PEN',
    enlacePdf:    '',
    enlaceXml:    '',
  }
}

export class MockInvoiceProvider implements IInvoiceProvider {
  async emit(data: InvoiceEmitData): Promise<InvoiceEmitResult> {
    const hash         = buildHash(data.tenant.ruc, data.invoice.series, data.invoice.number, data.invoice.total)
    const qrContent    = buildQrContent(data)
    const qrPngBuffer  = await QRCode.toBuffer(qrContent, { type: 'png', width: 128, margin: 1 })
    const sunat_response = buildCdrResponse(data, hash)
    const pdf_buffer     = await this._buildPdf(data, qrPngBuffer, hash)

    return { sunat_status: 'accepted', pdf_buffer, sunat_response }
  }

  async cancel(invoiceId: string, reason: string): Promise<void> {
    console.log(`[Billing] Cancel invoice ${invoiceId}: ${reason}`)
  }

  private _buildPdf(data: InvoiceEmitData, qrPngBuffer: Buffer, hash: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size:    'A4',
        margins: { top: 50, bottom: 50, left: LEFT, right: PAGE_W - RIGHT },
        info: {
          Title:   `${data.invoice.series}-${String(data.invoice.number).padStart(8, '0')}`,
          Author:  data.tenant.name,
          Subject: data.invoice.type === 'boleta' ? 'Boleta de Venta Electrónica' : 'Factura Electrónica',
        },
      })

      const chunks: Buffer[] = []
      doc.on('data',  (c: Buffer) => chunks.push(c))
      doc.on('end',   ()          => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // ── 1. Header ───────────────────────────────────────────────────────────
      const headerBottom = this._drawHeader(doc, data)

      // ── 2. Customer / date info ─────────────────────────────────────────────
      const customerBottom = this._drawCustomer(doc, data, headerBottom + 14)

      // ── 3. Items table ──────────────────────────────────────────────────────
      const tableBottom = this._drawItemsTable(doc, data, customerBottom + 14)

      // ── 4. Footer ───────────────────────────────────────────────────────────
      this._drawFooter(doc, tableBottom, qrPngBuffer, hash, data)

      doc.end()
    })
  }

  // ── Header: clinic left / document type box right ────────────────────────────
  private _drawHeader(doc: PDFKit.PDFDocument, data: InvoiceEmitData): number {
    const y = 50

    doc.fontSize(16).font('Helvetica-Bold').fillColor(COLOR_DARK)
       .text(data.tenant.name, LEFT, y, { width: USABLE * 0.55 })

    doc.fontSize(9).font('Helvetica').fillColor(COLOR_GRAY)
       .text(`RUC: ${data.tenant.ruc}`)

    if (data.tenant.address) {
      doc.fontSize(8).fillColor(COLOR_GRAY).text(data.tenant.address, { width: USABLE * 0.55 })
    }

    const isFactura    = data.invoice.type === 'factura'
    const docTypeLabel = isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'
    const seriesNum    = `${data.invoice.series}-${String(data.invoice.number).padStart(8, '0')}`

    const boxX = LEFT + USABLE * 0.62
    const boxW = USABLE * 0.38

    doc.rect(boxX, y - 4, boxW, 64).fillAndStroke('#FFFFFF', COLOR_PRIMARY)

    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR_DARK)
       .text(docTypeLabel, boxX, y + 4, { width: boxW, align: 'center' })

    doc.fontSize(18).font('Helvetica-Bold').fillColor(COLOR_PRIMARY)
       .text(seriesNum, boxX, y + 20, { width: boxW, align: 'center' })

    doc.fontSize(7).font('Helvetica').fillColor(COLOR_GRAY)
       .text('SERIE - NÚMERO', boxX, y + 44, { width: boxW, align: 'center' })

    const bottom = Math.max(doc.y, y + 64)
    drawHRule(doc, bottom + 8)
    return bottom + 8
  }

  // ── Customer section ─────────────────────────────────────────────────────────
  private _drawCustomer(doc: PDFKit.PDFDocument, data: InvoiceEmitData, startY: number): number {
    const isFactura = data.invoice.type === 'factura'
    const leftBoxW  = USABLE * 0.58
    const rightBoxX = LEFT + leftBoxW + 10
    const rightBoxW = USABLE - leftBoxW - 10
    const boxH      = isFactura ? 90 : 68

    doc.rect(LEFT, startY, leftBoxW, boxH).fillAndStroke(COLOR_LIGHT_BG, COLOR_BORDER)

    doc.fontSize(7).font('Helvetica-Bold').fillColor(COLOR_GRAY)
       .text('CLIENTE:', LEFT + 8, startY + 8)

    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLOR_DARK)
       .text(data.patient.fullName, LEFT + 8, startY + 20, { width: leftBoxW - 16 })

    doc.fontSize(9).font('Helvetica').fillColor(COLOR_GRAY)
       .text(`DNI: ${data.patient.dni}`, LEFT + 8, startY + 36)

    if (isFactura) {
      if (data.invoice.customerRuc) {
        doc.text(`RUC: ${data.invoice.customerRuc}`, LEFT + 8, startY + 50)
      }
      if (data.invoice.customerName) {
        doc.fontSize(8).text(data.invoice.customerName, LEFT + 8, startY + 64, { width: leftBoxW - 16 })
      }
    }

    doc.rect(rightBoxX, startY, rightBoxW, boxH).fillAndStroke(COLOR_LIGHT_BG, COLOR_BORDER)

    doc.fontSize(7).font('Helvetica-Bold').fillColor(COLOR_GRAY)
       .text('FECHA DE EMISIÓN:', rightBoxX + 8, startY + 8)

    doc.fontSize(13).font('Helvetica-Bold').fillColor(COLOR_DARK)
       .text(fmtDate(data.invoice.issuedAt), rightBoxX + 8, startY + 20, { width: rightBoxW - 16 })

    doc.fontSize(7).font('Helvetica-Bold').fillColor(COLOR_GRAY)
       .text('MONEDA:', rightBoxX + 8, startY + 44)

    doc.fontSize(9).font('Helvetica').fillColor(COLOR_DARK)
       .text('SOLES (PEN)', rightBoxX + 8, startY + 54)

    const bottom = startY + boxH
    drawHRule(doc, bottom + 8)
    return bottom + 8
  }

  // ── Items table ─────────────────────────────────────────────────────────────
  private _drawItemsTable(doc: PDFKit.PDFDocument, data: InvoiceEmitData, startY: number): number {
    let y = startY

    const ROW_H = 20
    doc.rect(LEFT, y, USABLE, ROW_H).fill(COLOR_TABLE_H)

    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLOR_DARK)
    this._tableCell(doc, '#',           LEFT,                                            y + 6, COL_NUM,   'center')
    this._tableCell(doc, 'DESCRIPCIÓN', LEFT + COL_NUM,                                  y + 6, COL_DESC,  'left')
    this._tableCell(doc, 'CANT.',       LEFT + COL_NUM + COL_DESC,                       y + 6, COL_QTY,   'center')
    this._tableCell(doc, 'P. UNIT.',    LEFT + COL_NUM + COL_DESC + COL_QTY,             y + 6, COL_PRICE, 'right')
    this._tableCell(doc, 'TOTAL',       LEFT + COL_NUM + COL_DESC + COL_QTY + COL_PRICE, y + 6, COL_TOTAL, 'right')

    doc.rect(LEFT, y, USABLE, ROW_H).stroke(COLOR_BORDER)
    y += ROW_H

    data.invoice.items.forEach((item, idx) => {
      const lineTotal = item.unit_price.mul(item.quantity)
      const rowBg     = idx % 2 === 1 ? '#FAFBFD' : '#FFFFFF'
      doc.rect(LEFT, y, USABLE, ROW_H).fill(rowBg)
      doc.rect(LEFT, y, USABLE, ROW_H).stroke(COLOR_BORDER)

      doc.fontSize(8).font('Helvetica').fillColor('#222222')
      this._tableCell(doc, String(idx + 1),           LEFT,                                            y + 6, COL_NUM,      'center')
      this._tableCell(doc, item.description,           LEFT + COL_NUM,                                  y + 6, COL_DESC - 4, 'left')
      this._tableCell(doc, String(item.quantity),      LEFT + COL_NUM + COL_DESC,                       y + 6, COL_QTY,      'center')
      this._tableCell(doc, fmtMoney(item.unit_price),  LEFT + COL_NUM + COL_DESC + COL_QTY,             y + 6, COL_PRICE,    'right')
      this._tableCell(doc, fmtMoney(lineTotal),        LEFT + COL_NUM + COL_DESC + COL_QTY + COL_PRICE, y + 6, COL_TOTAL,    'right')

      y += ROW_H
    })

    y += 10

    const totalsX = LEFT + USABLE * 0.55
    const totalsW = USABLE * 0.45

    doc.fontSize(9).font('Helvetica').fillColor(COLOR_GRAY)
       .text('SUBTOTAL:', totalsX, y, { width: totalsW * 0.5, align: 'left' })
    doc.fontSize(9).font('Helvetica').fillColor(COLOR_DARK)
       .text(fmtMoney(data.invoice.subtotal), totalsX + totalsW * 0.5, y, { width: totalsW * 0.5, align: 'right' })
    y += 16

    doc.fontSize(9).font('Helvetica').fillColor(COLOR_GRAY)
       .text('IGV (18%):', totalsX, y, { width: totalsW * 0.5, align: 'left' })
    doc.fontSize(9).font('Helvetica').fillColor(COLOR_DARK)
       .text(fmtMoney(data.invoice.tax), totalsX + totalsW * 0.5, y, { width: totalsW * 0.5, align: 'right' })
    y += 16

    doc.rect(totalsX - 4, y - 2, totalsW + 4, 22).fill(COLOR_PRIMARY)
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#FFFFFF')
       .text('TOTAL:', totalsX + 2, y + 4, { width: totalsW * 0.5, align: 'left' })
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#FFFFFF')
       .text(fmtMoney(data.invoice.total), totalsX + totalsW * 0.5, y + 4, { width: totalsW * 0.5, align: 'right' })
    y += 28

    drawHRule(doc, y + 4)
    return y + 4
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  private _drawFooter(
    doc:          PDFKit.PDFDocument,
    contentBottom: number,
    qrPngBuffer:  Buffer,
    hash:         string,
    data:         InvoiceEmitData,
  ): void {
    const footerY = Math.max(contentBottom + 20, PAGE_H - 130)
    const qrSize  = 72

    // ── QR code (real SUNAT-format content) ──────────────────────────────────
    doc.image(qrPngBuffer, LEFT, footerY, { width: qrSize, height: qrSize })

    // Label below QR
    doc.fontSize(6).font('Helvetica').fillColor(COLOR_GRAY)
       .text('Escanea para verificar', LEFT, footerY + qrSize + 3, { width: qrSize, align: 'center' })

    // ── Centre: legal text ────────────────────────────────────────────────────
    const centreX = LEFT + qrSize + 14
    const centreW = USABLE - qrSize - 14 - 105

    doc.fontSize(7).font('Helvetica-Bold').fillColor(COLOR_DARK)
       .text('Representación impresa del comprobante electrónico', centreX, footerY + 2, { width: centreW, align: 'center' })

    doc.fontSize(6.5).font('Helvetica').fillColor(COLOR_GRAY)
       .text('Autorizado por SUNAT mediante R.S. N° 097-2012/SUNAT y modificatorias', centreX, footerY + 14, { width: centreW, align: 'center' })
       .text('Generado a través del OSE Nubefact — www.nubefact.com', centreX, footerY + 25, { width: centreW, align: 'center' })
       .text('Consulte su comprobante en: e-factura.sunat.gob.pe', centreX, footerY + 36, { width: centreW, align: 'center' })

    // Hash (truncado para que quepa, igual de auténtico visualmente)
    const shortHash = hash.slice(0, 32) + '...'
    doc.fontSize(5.5).font('Helvetica').fillColor('#9CA3AF')
       .text(`Hash CDR: ${shortHash}`, centreX, footerY + 52, { width: centreW, align: 'center' })

    // Status badge — ACEPTADO
    const badgeX = centreX + (centreW - 80) / 2
    doc.rect(badgeX, footerY + 64, 80, 14).fill('#D1FAE5')
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#065F46')
       .text('✓ ACEPTADO POR SUNAT', badgeX, footerY + 68, { width: 80, align: 'center' })

    // ── Right: OSE branding ───────────────────────────────────────────────────
    const brandX = RIGHT - 95

    doc.rect(brandX, footerY, 95, qrSize + 16).fillAndStroke('#F8FAFC', COLOR_BORDER)

    doc.fontSize(6).font('Helvetica').fillColor(COLOR_GRAY)
       .text('PROCESADO POR', brandX + 4, footerY + 6, { width: 87, align: 'center' })

    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLOR_PRIMARY)
       .text('nubefact', brandX + 4, footerY + 16, { width: 87, align: 'center' })

    doc.fontSize(6).font('Helvetica').fillColor(COLOR_GRAY)
       .text('OSE autorizado por SUNAT', brandX + 4, footerY + 32, { width: 87, align: 'center' })
       .text('R.S. N° 033-2019/SUNAT', brandX + 4, footerY + 41, { width: 87, align: 'center' })

    doc.moveTo(brandX + 8, footerY + 54).lineTo(RIGHT - 8, footerY + 54)
       .strokeColor(COLOR_BORDER).lineWidth(0.5).stroke()

    doc.fontSize(6).font('Helvetica').fillColor(COLOR_GRAY)
       .text('Emisor electrónico:', brandX + 4, footerY + 58, { width: 87, align: 'center' })
       .text(data.tenant.name, brandX + 4, footerY + 67, { width: 87, align: 'center' })
       .text(`RUC ${data.tenant.ruc}`, brandX + 4, footerY + 76, { width: 87, align: 'center' })
  }

  // ── Helper: draw text in a fixed-width cell ──────────────────────────────────
  private _tableCell(
    doc:   PDFKit.PDFDocument,
    text:  string,
    x:     number,
    y:     number,
    width: number,
    align: 'left' | 'center' | 'right',
  ): void {
    doc.text(text, x + 2, y, { width: width - 4, align, lineBreak: false })
  }
}
