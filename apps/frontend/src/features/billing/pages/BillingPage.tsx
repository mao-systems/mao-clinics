import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import {
  Download,
  Ban,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useInvoices, useBillingSummary, useCancelInvoice, downloadInvoicePdf } from '../hooks/useBilling'
import type { Invoice, BillingFilters } from '../hooks/useBilling'
import { BillingSummaryCards } from '../components/BillingSummaryCards'
import { InvoiceFilters } from '../components/InvoiceFilters'
import { InvoiceForm } from '../components/InvoiceForm'
import {
  formatCurrency,
  formatInvoiceNumber,
  formatShortDate,
  getStatusLabel,
  getTypeLabel,
  firstDayOfMonth,
  todayIso,
} from '../utils/billing.utils'

// ── Column helper ─────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Invoice>()

// ── Loading skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileText className="w-12 h-12 text-gray-300 mb-4" />
      <p className="text-gray-600 font-medium">No hay comprobantes en este período</p>
      <p className="text-gray-400 text-sm mt-1">Emite el primer comprobante para comenzar</p>
      <Button size="sm" className="mt-4" onClick={onNew}>
        Nuevo comprobante
      </Button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [showForm, setShowForm] = useState(false)

  // Filters — default to current month
  const [filters, setFilters] = useState<BillingFilters>({
    from:  firstDayOfMonth(),
    to:    todayIso(),
    page:  1,
    limit: 20,
  })

  const { data, isLoading, isFetching } = useInvoices(filters)
  const invoices    = data?.data  ?? []
  const meta        = data?.meta  ?? { page: 1, limit: 20, total: 0, totalPages: 1 }

  const { data: summary } = useBillingSummary(
    filters.from ?? firstDayOfMonth(),
    filters.to   ?? todayIso(),
  )

  const cancelMutation = useCancelInvoice()

  // Cancel confirm state
  const [cancelTarget,   setCancelTarget]  = useState<Invoice | null>(null)
  const [cancelReason,   setCancelReason]  = useState('')
  const [downloading,    setDownloading]   = useState<string | null>(null)

  async function handleDownload(inv: Invoice) {
    setDownloading(inv.id)
    try {
      await downloadInvoicePdf(inv.id, inv.series, inv.number)
    } finally {
      setDownloading(null)
    }
  }

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      // N° Comprobante
      columnHelper.display({
        id:     'number',
        header: 'N° Comprobante',
        cell:   ({ row }) => (
          <span className="font-mono text-sm font-semibold text-gray-800">
            {formatInvoiceNumber(row.original.series, row.original.number)}
          </span>
        ),
      }),

      // Tipo
      columnHelper.accessor('type', {
        header: 'Tipo',
        cell:   ({ getValue }) => (
          <Badge variant="info">{getTypeLabel(getValue())}</Badge>
        ),
      }),

      // Paciente
      columnHelper.display({
        id:     'patient',
        header: 'Paciente',
        cell:   ({ row }) => {
          const p = row.original.patient
          return (
            <div>
              <p className="text-sm font-medium text-gray-800">
                {p.first_name} {p.last_name}
              </p>
              <p className="text-xs text-gray-400">DNI {p.dni}</p>
            </div>
          )
        },
      }),

      // Fecha
      columnHelper.accessor('issued_at', {
        header: 'Fecha',
        cell:   ({ getValue }) => (
          <span className="text-sm text-gray-600">{formatShortDate(getValue())}</span>
        ),
      }),

      // Total
      columnHelper.accessor('total', {
        header: 'Total',
        cell:   ({ getValue }) => (
          <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
            {formatCurrency(getValue())}
          </span>
        ),
      }),

      // Estado
      columnHelper.accessor('sunat_status', {
        header: 'Estado',
        cell:   ({ getValue }) => {
          const s = getStatusLabel(getValue())
          return <Badge variant={s.variant}>{s.label}</Badge>
        },
      }),

      // Acciones
      columnHelper.display({
        id:     'actions',
        header: '',
        cell:   ({ row }) => {
          const inv         = row.original
          const isCancelled = inv.sunat_status === 'cancelled'
          return (
            <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleDownload(inv)}
                disabled={downloading === inv.id}
                className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-gray-100 transition-colors"
                title="Descargar PDF"
              >
                {downloading === inv.id
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Download size={14} />
                }
              </button>
              {!isCancelled && (
                <button
                  onClick={() => { setCancelTarget(inv); setCancelReason('') }}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 transition-colors"
                  title="Anular comprobante"
                >
                  <Ban size={14} />
                </button>
              )}
            </div>
          )
        },
      }),
    ],
    [downloading],
  )

  const table = useReactTable({
    data:            invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const { page, totalPages, total, limit } = meta
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end   = Math.min(page * limit, total)

  // Period label for summary cards
  const periodLabel = filters.from && filters.to
    ? `${formatShortDate(filters.from)} – ${formatShortDate(filters.to)}`
    : 'período actual'

  return (
    <div>
      <PageHeader
        title="Facturación"
        subtitle={`${total} comprobante${total !== 1 ? 's' : ''} en el período`}
      />

      {/* Summary cards */}
      {summary && (
        <div className="mb-5">
          <BillingSummaryCards summary={summary} period={periodLabel} />
        </div>
      )}

      {/* Filters */}
      <InvoiceFilters
        filters={filters}
        onChange={setFilters}
        onNew={() => setShowForm(true)}
      />

      {/* Table */}
      <div className="bg-white rounded-base border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            {isFetching && !isLoading ? (
              <span style={{ color: 'var(--color-primary)' }}>Actualizando...</span>
            ) : (
              <>{total} comprobante{total !== 1 ? 's' : ''}</>
            )}
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <TableSkeleton />
        ) : invoices.length === 0 ? (
          <EmptyState onNew={() => setShowForm(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span className="hidden sm:inline">Filas por página:</span>
              <select
                value={filters.limit ?? 20}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))
                }
                className="border border-gray-200 rounded text-xs px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>
                {start}–{end} de {total}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                disabled={page <= 1}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                disabled={page >= totalPages}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel modal */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Anular comprobante"
        size="sm"
      >
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Estás seguro de que deseas anular{' '}
              <span className="font-mono font-semibold">
                {formatInvoiceNumber(cancelTarget.series, cancelTarget.number)}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Motivo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: Error en el monto, servicio no prestado..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-base resize-none focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCancelTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                isLoading={cancelMutation.isPending}
                onClick={() => {
                  if (!cancelReason.trim() || !cancelTarget) return
                  cancelMutation.mutate(
                    { id: cancelTarget.id, reason: cancelReason.trim() },
                    { onSuccess: () => setCancelTarget(null) },
                  )
                }}
              >
                Anular
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Invoice form modal */}
      {showForm && (
        <InvoiceForm onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}
