// ── Currency ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(n)) return 'S/ 0.00'
  return `S/ ${n.toFixed(2)}`
}

// ── Invoice number ────────────────────────────────────────────────────────────

export function formatInvoiceNumber(series: string, number: number): string {
  return `${series}-${String(number).padStart(8, '0')}`
}

// ── SUNAT status ──────────────────────────────────────────────────────────────

export interface StatusInfo {
  label:   string
  color:   string   // hex for custom styling
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function getStatusLabel(status: string): StatusInfo {
  const map: Record<string, StatusInfo> = {
    mock:      { label: 'Demo',      color: '#6B7280', variant: 'default'  },
    pending:   { label: 'Pendiente', color: '#F59E0B', variant: 'warning'  },
    accepted:  { label: 'Aceptado',  color: '#10B981', variant: 'success'  },
    rejected:  { label: 'Rechazado', color: '#EF4444', variant: 'danger'   },
    cancelled: { label: 'Anulado',   color: '#6B7280', variant: 'default'  },
  }
  return map[status] ?? { label: status, color: '#6B7280', variant: 'default' }
}

// ── Invoice type ──────────────────────────────────────────────────────────────

export function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    boleta:       'Boleta de Venta',
    factura:      'Factura',
    nota_credito: 'Nota de Crédito',
  }
  return map[type] ?? type
}

// ── Totals (frontend preview — Decimal.js lives on the backend) ───────────────

export interface InvoiceItemInput {
  description: string
  quantity:    number | string
  unit_price:  string
}

export interface InvoiceTotals {
  subtotal: string
  tax:      string
  total:    string
}

export function calculateTotals(items: InvoiceItemInput[]): InvoiceTotals {
  const subtotal = items.reduce((sum, item) => {
    const qty   = typeof item.quantity === 'string' ? parseInt(item.quantity, 10) : item.quantity
    const price = parseFloat(item.unit_price) || 0
    return sum + price * (isNaN(qty) ? 0 : qty)
  }, 0)

  const tax   = Math.round(subtotal * 0.18 * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100

  return {
    subtotal: subtotal.toFixed(2),
    tax:      tax.toFixed(2),
    total:    total.toFixed(2),
  }
}

// ── Date formatting ───────────────────────────────────────────────────────────

// Returns "15 jun 2026" format
export function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day:   'numeric',
      month: 'short',
      year:  'numeric',
    })
  } catch {
    return '—'
  }
}

// Returns first day of current month as ISO date string
export function firstDayOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

// Returns current date as ISO string
export function todayIso(): string {
  return new Date().toISOString()
}

// Returns date string in YYYY-MM-DD format for <input type="date">
export function toDateInputValue(iso: string): string {
  return iso.slice(0, 10)
}
