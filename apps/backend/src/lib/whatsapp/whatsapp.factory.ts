import { env } from '@/config/env'
import type { IWhatsAppProvider } from './whatsapp.interface'
import { MockWhatsAppProvider } from './mock.provider'
import { MetaWhatsAppProvider } from './meta.provider'

export function getWhatsAppProvider(): IWhatsAppProvider {
  if (env.WHATSAPP_PROVIDER === 'meta') return new MetaWhatsAppProvider()
  return new MockWhatsAppProvider()
}
