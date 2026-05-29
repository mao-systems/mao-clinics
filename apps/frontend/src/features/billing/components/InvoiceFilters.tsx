import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toDateInputValue } from '../utils/billing.utils'
import type { BillingFilters } from '../hooks/useBilling'

interface InvoiceFiltersProps {
  filters:  BillingFilters
  onChange: (filters: BillingFilters) => void
  onNew:    () => void
}

const TYPE_OPTIONS = [
  { value: '',             label: 'Todos' },
  { value: 'boleta',       label: 'Boletas' },
  { value: 'factura',      label: 'Facturas' },
  { value: 'nota_credito', label: 'Notas de crédito' },
]

export function InvoiceFilters({ filters, onChange, onNew }: InvoiceFiltersProps) {
  function set(patch: Partial<BillingFilters>) {
    onChange({ ...filters, ...patch, page: 1 })
  }

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      {/* Date from */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Desde</label>
        <input
          type="date"
          value={filters.from ? toDateInputValue(filters.from) : ''}
          onChange={(e) =>
            set({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })
          }
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-base focus:outline-none focus:ring-2 bg-white"
          style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
        />
      </div>

      {/* Date to */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Hasta</label>
        <input
          type="date"
          value={filters.to ? toDateInputValue(filters.to) : ''}
          onChange={(e) =>
            set({ to: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined })
          }
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-base focus:outline-none focus:ring-2 bg-white"
          style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tipo</label>
        <select
          value={filters.type ?? ''}
          onChange={(e) => set({ type: e.target.value || undefined })}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-base focus:outline-none focus:ring-2 bg-white pr-8"
          style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Spacer + action */}
      <div className="ml-auto">
        <Button onClick={onNew} size="sm">
          <Plus size={14} className="mr-1.5" />
          Nuevo comprobante
        </Button>
      </div>
    </div>
  )
}
