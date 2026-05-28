import PDFDocument from 'pdfkit'
import { formatInTimeZone } from 'date-fns-tz'

const LIMA_TZ = 'America/Lima'

interface PrescriptionItem {
  medication:    string
  dosage:        string
  frequency:     string
  duration_days: number
  notes?:        string | null
}

interface PrescriptionPdfData {
  prescriptionId:    string
  issuedAt:          Date
  // Clinic info
  clinicName:        string
  clinicRuc:         string
  // Doctor info
  doctorName:        string
  doctorSpecialty:   string
  doctorCmp?:        string | null
  // Patient info
  patientName:       string
  patientDni:        string
  patientDob?:       Date | null
  // Prescription data
  instructions?:     string | null
  items:             PrescriptionItem[]
}

class PdfService {
  // Returns the PDF as a Buffer so the route handler can stream it
  generatePrescriptionPdf(data: PrescriptionPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size:    'A4',
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
      })

      const chunks: Buffer[] = []
      doc.on('data',  (chunk: Buffer) => chunks.push(chunk))
      doc.on('end',   ()             => resolve(Buffer.concat(chunks)))
      doc.on('error', (err: Error)   => reject(err))

      const PAGE_WIDTH = doc.page.width - 120  // usable width (margins)
      const LEFT       = 60

      // ── Header ──────────────────────────────────────────────────────────────
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#1A2740')
        .text(data.clinicName, LEFT, 50, { width: PAGE_WIDTH, align: 'left' })

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text(`RUC: ${data.clinicRuc}`, { align: 'left' })

      // "RECETA MÉDICA" title on the right side of the header
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#1A5F9E')
        .text('RECETA MÉDICA', LEFT, 50, { width: PAGE_WIDTH, align: 'right' })

      const issuedStr = formatInTimeZone(data.issuedAt, LIMA_TZ, 'dd/MM/yyyy')
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#555555')
        .text(`Receta N° ${data.prescriptionId.slice(-8).toUpperCase()}`, LEFT, 72, {
          width: PAGE_WIDTH,
          align: 'right',
        })
        .text(`Fecha: ${issuedStr}`, LEFT, 84, { width: PAGE_WIDTH, align: 'right' })

      // Divider line
      doc.moveTo(LEFT, 110).lineTo(LEFT + PAGE_WIDTH, 110).strokeColor('#CCCCCC').stroke()

      // ── Doctor section ───────────────────────────────────────────────────────
      doc.moveDown(0.5)
      doc.y = 120

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text('MÉDICO', LEFT)
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#111111')
        .text(data.doctorName)
      doc
        .fontSize(8)
        .fillColor('#555555')
        .text(`Especialidad: ${data.doctorSpecialty}`)
      if (data.doctorCmp) {
        doc.text(`CMP: ${data.doctorCmp}`)
      }

      // ── Patient box (gray background) ────────────────────────────────────────
      const boxTop = doc.y + 12
      doc
        .rect(LEFT, boxTop, PAGE_WIDTH, 52)
        .fillAndStroke('#F5F7FA', '#E0E6EE')

      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text('PACIENTE', LEFT + 10, boxTop + 8)

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#111111')
        .text(data.patientName, LEFT + 10, boxTop + 20)

      doc
        .fontSize(8)
        .fillColor('#555555')
        .text(`DNI: ${data.patientDni}`, LEFT + 10, boxTop + 36)

      if (data.patientDob) {
        const dobStr = formatInTimeZone(data.patientDob, LIMA_TZ, 'dd/MM/yyyy')
        doc.text(`Fecha de nacimiento: ${dobStr}`, LEFT + 200, boxTop + 36)
      }

      doc.y = boxTop + 64

      // ── Medications ──────────────────────────────────────────────────────────
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#1A5F9E')
        .text('MEDICAMENTOS', LEFT)

      doc.moveTo(LEFT, doc.y + 2).lineTo(LEFT + PAGE_WIDTH, doc.y + 2).strokeColor('#1A5F9E').stroke()
      doc.moveDown(0.6)

      data.items.forEach((item, idx) => {
        const yBefore = doc.y

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#111111')
          .text(`${idx + 1}. ${item.medication}`, LEFT, yBefore)

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#333333')
          .text(
            `   Dosis: ${item.dosage}   ·   Frecuencia: ${item.frequency}   ·   Duración: ${item.duration_days} día${item.duration_days !== 1 ? 's' : ''}`,
            LEFT,
          )

        if (item.notes) {
          doc
            .fontSize(8)
            .fillColor('#666666')
            .text(`   Obs: ${item.notes}`, LEFT)
        }

        doc.moveDown(0.5)
      })

      // ── Observations ─────────────────────────────────────────────────────────
      if (data.instructions) {
        doc.moveDown(0.3)
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#1A5F9E')
          .text('OBSERVACIONES / INDICACIONES', LEFT)

        doc.moveTo(LEFT, doc.y + 2).lineTo(LEFT + PAGE_WIDTH, doc.y + 2).strokeColor('#1A5F9E').stroke()
        doc.moveDown(0.5)

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#333333')
          .text(data.instructions, LEFT, undefined, { width: PAGE_WIDTH })
      }

      // ── Footer with signature line ────────────────────────────────────────────
      const PAGE_HEIGHT = doc.page.height
      const footerY     = PAGE_HEIGHT - 110

      doc.moveTo(LEFT, footerY).lineTo(LEFT + PAGE_WIDTH, footerY).strokeColor('#CCCCCC').stroke()

      // Signature line
      const sigX = LEFT + PAGE_WIDTH - 180
      doc.moveTo(sigX, footerY + 48).lineTo(sigX + 160, footerY + 48).strokeColor('#333333').stroke()

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#555555')
        .text('Firma y sello del médico', sigX, footerY + 52, { width: 160, align: 'center' })

      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text(data.doctorName, sigX, footerY + 64, { width: 160, align: 'center' })

      if (data.doctorCmp) {
        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#555555')
          .text(`CMP: ${data.doctorCmp}`, sigX, footerY + 76, { width: 160, align: 'center' })
      }

      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('#AAAAAA')
        .text(
          `Generado por MAO Clinics — maosystems.io`,
          LEFT,
          PAGE_HEIGHT - 30,
          { width: PAGE_WIDTH, align: 'center' },
        )

      doc.end()
    })
  }
}

export const pdfService = new PdfService()
