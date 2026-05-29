import Decimal from 'decimal.js'

export interface InvoiceItemData {
  description: string
  quantity:    number
  unit_price:  Decimal
}

export interface InvoiceEmitData {
  tenant: {
    name:     string
    ruc:      string
    address?: string | null
  }
  patient: {
    fullName: string
    dni:      string
  }
  invoice: {
    type:     'boleta' | 'factura'
    series:   string       // B001 or F001
    number:   number       // sequential
    items:    InvoiceItemData[]
    subtotal: Decimal
    tax:      Decimal      // IGV 18%
    total:    Decimal
    issuedAt: Date
    // Factura-only
    customerRuc?:     string | null
    customerName?:    string | null
    customerAddress?: string | null
  }
}

export interface InvoiceEmitResult {
  sunat_status:    string         // "mock" | "accepted" | "rejected"
  pdf_buffer:      Buffer
  sunat_response?: object | null  // raw Nubefact response, null for mock
}

export interface IInvoiceProvider {
  emit(data: InvoiceEmitData): Promise<InvoiceEmitResult>
  cancel(invoiceId: string, reason: string): Promise<void>
}
