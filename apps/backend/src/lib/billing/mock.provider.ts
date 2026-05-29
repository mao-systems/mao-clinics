import PDFDocument from 'pdfkit'
import Decimal from 'decimal.js'
import { formatInTimeZone } from 'date-fns-tz'
import type { IInvoiceProvider, InvoiceEmitData, InvoiceEmitResult } from './billing.interface'

const LIMA_TZ = 'America/Lima'

// ── Layout constants (A4 = 595 × 842 pt) ──────────────────────────────────────
const PAGE_W  = 595
const PAGE_H  = 842
const LEFT    = 60
const RIGHT   = 535   // LEFT + usable (475)
const USABLE  = 475

// Column widths for the items table
const COL_NUM   = 25
const COL_DESC  = 210
const COL_QTY   = 55
const COL_PRICE = 90
const COL_TOTAL = 95  // sum = 475 ✓

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

export class MockInvoiceProvider implements IInvoiceProvider {
  async emit(data: InvoiceEmitData): Promise<InvoiceEmitResult> {
    const pdf_buffer = await this._buildPdf(data)
    return { sunat_status: 'mock', pdf_buffer, sunat_response: null }
  }

  async cancel(invoiceId: string, reason: string): Promise<void> {
    // Mock: just log — no real SUNAT call needed
    console.log(`[MockBilling] Cancel invoice ${invoiceId}: ${reason}`)
  }

  private _buildPdf(data: InvoiceEmitData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size:    'A4',
        margins: { top: 50, bottom: 50, left: LEFT, right: PAGE_W - RIGHT },
        info: {
          Title:   `${data.invoice.series}-${String(data.invoice.number).padStart(8, '0')}`,
          Author:  'MAO Systems',
          Subject: data.invoice.type === 'boleta' ? 'Boleta de Venta Electrónica' : 'Factura Electrónica',
        },
      })

      const chunks: Buffer[] = []
      doc.on('data',  (c: Buffer) => chunks.push(c))
      doc.on('end',   ()          => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // ── 1. Watermark (drawn first so it appears behind content) ─────────────
      this._drawWatermark(doc)

      // ── 2. Header ───────────────────────────────────────────────────────────
      const headerBottom = this._drawHeader(doc, data)

      // ── 3. Customer / date info ─────────────────────────────────────────────
      const customerBottom = this._drawCustomer(doc, data, headerBottom + 14)

      // ── 4. Items table ──────────────────────────────────────────────────────
      const tableBottom = this._drawItemsTable(doc, data, customerBottom + 14)

      // ── 5. Footer ───────────────────────────────────────────────────────────
      this._drawFooter(doc, tableBottom)

      doc.end()
    })
  }

  // ── Watermark ───────────────────────────────────────────────────────────────
  private _drawWatermark(doc: PDFKit.PDFDocument): void {
    doc.save()
    doc.fillOpacity(0.07)
    // Rotate -45° around the visual centre of the page
    doc.rotate(-45, { origin: [PAGE_W / 2, PAGE_H / 2] })
    doc
      .fontSize(52)
      .font('Helvetica-Bold')
      .fillColor('#888888')
      .text(
        'DEMO — NO VÁLIDO ANTE SUNAT',
        0,
        PAGE_H / 2 - 26,
        { width: PAGE_W, align: 'center', lineBreak: false },
      )
    doc.restore()
    // Reset opacity for all subsequent drawing
    doc.fillOpacity(1)
  }

  // ── Header: clinic left / document type right ────────────────────────────────
  private _drawHeader(doc: PDFKit.PDFDocument, data: InvoiceEmitData): number {
    const y = 50

    // Left — clinic identity
    doc.fontSize(16).font('Helvetica-Bold').fillColor(COLOR_DARK)
       .text(data.tenant.name, LEFT, y, { width: USABLE * 0.55 })

    doc.fontSize(9).font('Helvetica').fillColor(COLOR_GRAY)
       .text(`RUC: ${data.tenant.ruc}`)

    if (data.tenant.address) {
      doc.fontSize(8).fillColor(COLOR_GRAY).text(data.tenant.address, { width: USABLE * 0.55 })
    }

    // Right — document type box
    const isFactura    = data.invoice.type === 'factura'
    const docTypeLabel = isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'
    const seriesNum    = `${data.invoice.series}-${String(data.invoice.number).padStart(8, '0')}`

    const boxX = LEFT + USABLE * 0.62
    const boxW = USABLE * 0.38

    // Outer box with border
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
    const isFactura    = data.invoice.type === 'factura'
    const leftBoxW     = USABLE * 0.58
    const rightBoxX    = LEFT + leftBoxW + 10
    const rightBoxW    = USABLE - leftBoxW - 10
    const boxH         = isFactura ? 90 : 68

    // Left box — client info
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

    // Right box — date / currency
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

    // Table header row
    const ROW_H = 20
    doc.rect(LEFT, y, USABLE, ROW_H).fill(COLOR_TABLE_H)

    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLOR_DARK)
    this._tableCell(doc, '#',           LEFT,                                    y + 6, COL_NUM,   'center')
    this._tableCell(doc, 'DESCRIPCIÓN', LEFT + COL_NUM,                          y + 6, COL_DESC,  'left')
    this._tableCell(doc, 'CANT.',       LEFT + COL_NUM + COL_DESC,               y + 6, COL_QTY,   'center')
    this._tableCell(doc, 'P. UNIT.',    LEFT + COL_NUM + COL_DESC + COL_QTY,     y + 6, COL_PRICE, 'right')
    this._tableCell(doc, 'TOTAL',       LEFT + COL_NUM + COL_DESC + COL_QTY + COL_PRICE, y + 6, COL_TOTAL, 'right')

    // Header border
    doc.rect(LEFT, y, USABLE, ROW_H).stroke(COLOR_BORDER)
    y += ROW_H

    // Item rows
    data.invoice.items.forEach((item, idx) => {
      const lineTotal = item.unit_price.mul(item.quantity)
      const rowBg     = idx % 2 === 1 ? '#FAFBFD' : '#FFFFFF'
      doc.rect(LEFT, y, USABLE, ROW_H).fill(rowBg)
      doc.rect(LEFT, y, USABLE, ROW_H).stroke(COLOR_BORDER)

      doc.fontSize(8).font('Helvetica').fillColor('#222222')
      this._tableCell(doc, String(idx + 1),           LEFT,                                    y + 6, COL_NUM,   'center')
      this._tableCell(doc, item.description,           LEFT + COL_NUM,                          y + 6, COL_DESC - 4, 'left')
      this._tableCell(doc, String(item.quantity),      LEFT + COL_NUM + COL_DESC,               y + 6, COL_QTY,   'center')
      this._tableCell(doc, fmtMoney(item.unit_price),  LEFT + COL_NUM + COL_DESC + COL_QTY,     y + 6, COL_PRICE, 'right')
      this._tableCell(doc, fmtMoney(lineTotal),        LEFT + COL_NUM + COL_DESC + COL_QTY + COL_PRICE, y + 6, COL_TOTAL, 'right')

      y += ROW_H
    })

    y += 10

    // Totals (right-aligned)
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

    // Total row — larger and bold
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
  private _drawFooter(doc: PDFKit.PDFDocument, contentBottom: number): void {
    // Pin footer to bottom of page, but never overlap content
    const footerY = Math.max(contentBottom + 20, PAGE_H - 110)

    // QR placeholder (gray square, left)
    const qrSize = 64
    doc.rect(LEFT, footerY, qrSize, qrSize).fillAndStroke('#EEEEEE', COLOR_BORDER)
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#BBBBBB')
       .text('QR', LEFT, footerY + 24, { width: qrSize, align: 'center' })

    // Legal text (centre)
    const centreX = LEFT + qrSize + 10
    const centreW = USABLE - qrSize - 10 - 100
    doc.fontSize(7).font('Helvetica').fillColor(COLOR_GRAY)
       .text(
         'Representación impresa del comprobante electrónico',
         centreX, footerY + 4,
         { width: centreW, align: 'center' },
       )
       .text(
         'Autorizado mediante Resolución de Superintendencia',
         centreX, footerY + 16,
         { width: centreW, align: 'center' },
       )
       .text(
         'SUNAT – Sistema de Emisión Electrónica (Mock)',
         centreX, footerY + 28,
         { width: centreW, align: 'center' },
       )

    // Branding (right)
    const brandX = RIGHT - 90
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLOR_PRIMARY)
       .text('Generado por', brandX, footerY + 8, { width: 90, align: 'center' })
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR_DARK)
       .text('MAO Systems', brandX, footerY + 20, { width: 90, align: 'center' })
    doc.fontSize(7).font('Helvetica').fillColor(COLOR_GRAY)
       .text('maosystems.io', brandX, footerY + 34, { width: 90, align: 'center' })
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
