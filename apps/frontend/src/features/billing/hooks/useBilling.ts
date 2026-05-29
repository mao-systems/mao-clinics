import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiInstance } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { formatInvoiceNumber } from '../utils/billing.utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id:          string
  invoice_id:  string
  description: string
  quantity:    number
  unit_price:  string
  total:       string
}

export interface Invoice {
  id:              string
  tenant_id:       string
  patient_id:      string
  consultation_id: string | null
  type:            'boleta' | 'factura' | 'nota_credito'
  series:          string
  number:          number
  subtotal:        string
  tax:             string
  total:           string
  currency:        string
  sunat_status:    string
  sunat_response:  unknown
  pdf_url:         string | null
  issued_at:       string
  created_at:      string
  updated_at:      string
  patient: {
    first_name: string
    last_name:  string
    dni:        string
  }
  items: InvoiceItem[]
}

export interface BillingSummary {
  total_invoices: number
  total_boletas:  number
  total_facturas: number
  total_amount:   string | number
  total_tax:      string | number
}

export interface BillingFilters {
  from?:       string
  to?:         string
  type?:       string
  patient_id?: string
  page?:       number
  limit?:      number
}

export interface CreateInvoicePayload {
  patient_id:       string
  consultation_id?: string | null
  type:             'boleta' | 'factura'
  items:            Array<{ description: string; quantity: number; unit_price: string }>
  customer_ruc?:    string
  customer_name?:   string
  customer_address?: string
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useInvoices(filters: BillingFilters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, unknown>

  return useQuery({
    queryKey:        ['billing', filters],
    queryFn:         () => api.getList<Invoice>('/billing', params),
    placeholderData: keepPreviousData,
  })
}

export function useBillingSummary(from: string, to: string) {
  return useQuery({
    queryKey: ['billing', 'summary', from, to],
    queryFn:  () =>
      api.get<BillingSummary>('/billing/summary', { params: { from, to } }),
    enabled: !!(from && to),
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: (data: CreateInvoicePayload) =>
      api.post<{ invoice: Invoice }>('/billing', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Comprobante emitido correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCancelInvoice() {
  const queryClient = useQueryClient()
  const toast       = useToast()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<{ invoice: Invoice }>(`/billing/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast.success('Comprobante anulado')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// Streams the PDF from the backend and triggers a browser download
export async function downloadInvoicePdf(
  invoiceId: string,
  series:    string,
  number:    number,
): Promise<void> {
  const response = await apiInstance.get(`/billing/${invoiceId}/pdf`, {
    responseType: 'blob',
  })

  const url      = URL.createObjectURL(
    new Blob([response.data as BlobPart], { type: 'application/pdf' }),
  )
  const a        = document.createElement('a')
  a.href         = url
  a.download     = `${formatInvoiceNumber(series, number)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
