import { formatInTimeZone } from 'date-fns-tz'
import type { IWhatsAppProvider, WhatsAppMessageData, WhatsAppSendResult } from './whatsapp.interface'

const LIMA_TZ = 'America/Lima'

export class MockWhatsAppProvider implements IWhatsAppProvider {
  async send(data: WhatsAppMessageData): Promise<WhatsAppSendResult> {
    console.log(`[WhatsApp MOCK] → ${data.to}`)
    console.log(`  Patient: ${data.patientName}`)
    console.log(`  Doctor: ${data.doctorName}`)
    console.log(`  Time: ${formatInTimeZone(data.scheduledAt, LIMA_TZ, 'dd/MM/yyyy HH:mm')}`)
    return { status: 'mock', messageId: `mock-${Date.now()}` }
  }
}
