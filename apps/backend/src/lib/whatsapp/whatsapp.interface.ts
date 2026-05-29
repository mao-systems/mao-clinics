export interface WhatsAppMessageData {
  to:           string  // E.164 with country code: "51987234561"
  patientName:  string
  doctorName:   string
  scheduledAt:  Date
  clinicName:   string
}

export interface WhatsAppSendResult {
  status:     'sent' | 'mock' | 'failed'
  messageId?: string
  error?:     string
}

export interface IWhatsAppProvider {
  send(data: WhatsAppMessageData): Promise<WhatsAppSendResult>
}
