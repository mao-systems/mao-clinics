import { env } from '@/config/env'
import type { IInvoiceProvider } from './billing.interface'
import { MockInvoiceProvider } from './mock.provider'
import { NubefactProvider } from './nubefact.provider'

export function getBillingProvider(): IInvoiceProvider {
  if (env.BILLING_PROVIDER === 'nubefact') return new NubefactProvider()
  return new MockInvoiceProvider()
}
