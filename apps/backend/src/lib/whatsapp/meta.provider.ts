import { formatInTimeZone } from 'date-fns-tz'
import { env } from '@/config/env'
import { AppError } from '@/lib/errors'
import type { IWhatsAppProvider, WhatsAppMessageData, WhatsAppSendResult } from './whatsapp.interface'

const LIMA_TZ = 'America/Lima'

export class MetaWhatsAppProvider implements IWhatsAppProvider {
  async send(data: WhatsAppMessageData): Promise<WhatsAppSendResult> {
    if (!env.META_WHATSAPP_TOKEN || !env.META_PHONE_NUMBER_ID) {
      throw new AppError(
        'META_NOT_CONFIGURED',
        500,
        'WhatsApp Meta API no está configurado.',
      )
    }

    try {
      const formattedTime = formatInTimeZone(data.scheduledAt, LIMA_TZ, "dd/MM/yyyy 'a las' HH:mm")

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${env.META_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.META_WHATSAPP_TOKEN}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to:                data.to,
            type:              'template',
            template: {
              name:     'recordatorio_cita',
              language: { code: 'es' },
              components: [{
                type:       'body',
                parameters: [
                  { type: 'text', text: data.patientName },
                  { type: 'text', text: data.doctorName },
                  { type: 'text', text: formattedTime },
                  { type: 'text', text: data.clinicName },
                ],
              }],
            },
          }),
        },
      )

      const body = await response.json() as { messages?: Array<{ id: string }> }

      if (!response.ok) {
        return { status: 'failed', error: `HTTP ${response.status}` }
      }

      return { status: 'sent', messageId: body.messages?.[0]?.id }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { status: 'failed', error }
    }
  }
}
