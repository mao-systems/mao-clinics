import { useState } from 'react'
import { Download, Ban } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Invoice } from '../hooks/useBilling'
import { downloadInvoicePdf, useCancelInvoice } from '../hooks/useBilling'
import {
  formatCurrency,
  formatInvoiceNumber,
  formatShortDate,
  getStatusLabel,
  getTypeLabel,
} from '../utils/billing.utils'

interface InvoiceCardProps {
  invoice: Invoice
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const [downloading,    setDownloading]   = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason,   setCancelReason]  = useState('')

  const cancelMutation = useCancelInvoice()
  const status         = getStatusLabel(invoice.sunat_status)
  const isCancelled    = invoice.sunat_status === 'cancelled'
  const patientName    = `${invoice.patient.first_name} ${invoice.patient.last_name}`

  // First item description for summary
  const firstItem   = invoice.items[0]
  const extraCount  = invoice.items.length - 1
  const itemSummary = firstItem
    ? extraCount > 0
      ? `${firstItem.description} y ${extraCount} más`
      : firstItem.description
    : '—'

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadInvoicePdf(invoice.id, invoice.series, invoice.number)
    } finally {
      setDownloading(false)
    }
  }

  function handleCancelConfirm() {
    if (!cancelReason.trim()) return
    cancelMutation.mutate(
      { id: invoice.id, reason: cancelReason.trim() },
      { onSuccess: () => setShowCancelModal(false) },
    )
  }

  return (
    <>
      <div className="bg-white rounded-base border border-gray-200 p-4 hover:border-gray-300 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-gray-800">
              {formatInvoiceNumber(invoice.series, invoice.number)}
            </span>
            <Badge variant="info">{getTypeLabel(invoice.type)}</Badge>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatShortDate(invoice.issued_at)}
          </span>
        </div>

        {/* Body */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-gray-800 truncate">{patientName}</p>
            <p className="text-xs text-gray-400">DNI {invoice.patient.dni}</p>
            <p className="text-xs text-gray-500 mt-1 truncate">{itemSummary}</p>
          </div>
          <p className="text-lg font-bold flex-shrink-0" style={{ color: 'var(--color-primary)' }}>
            {formatCurrency(invoice.total)}
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            isLoading={downloading}
            className="text-xs"
          >
            <Download size={13} className="mr-1" />
            Descargar PDF
          </Button>

          {!isCancelled && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="ml-auto text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded-base px-2.5 py-1 transition-colors"
            >
              <Ban size={11} className="inline mr-1 mb-0.5" />
              Anular
            </button>
          )}
        </div>
      </div>

      {/* Cancel confirmation modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Anular comprobante"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de que deseas anular el comprobante{' '}
            <span className="font-mono font-semibold">
              {formatInvoiceNumber(invoice.series, invoice.number)}
            </span>
            ? Esta acción no se puede deshacer.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Motivo de anulación <span className="text-red-500">*</span>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancelConfirm}
              disabled={!cancelReason.trim()}
              isLoading={cancelMutation.isPending}
            >
              Anular comprobante
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
