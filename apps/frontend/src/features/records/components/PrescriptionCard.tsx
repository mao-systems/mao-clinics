import { useState } from 'react'
import { Download, Pill, ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Spinner } from '@/components/ui/Spinner'
import { downloadPrescriptionPdf } from '../hooks/useRecords'
import type { Prescription } from '../hooks/useRecords'

interface PrescriptionCardProps {
  prescription: Prescription
  recordId:     string
}

export function PrescriptionCard({ prescription, recordId }: PrescriptionCardProps) {
  const [expanded,     setExpanded]     = useState(false)
  const [downloading,  setDownloading]  = useState(false)

  const issuedDate = (() => {
    try {
      return format(parseISO(prescription.issued_at), "d 'de' MMM yyyy", { locale: es })
    } catch {
      return '—'
    }
  })()

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadPrescriptionPdf(recordId, prescription.id)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-base overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-200">
        <Pill size={13} className="text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800">
            Receta #{prescription.id.slice(-6).toUpperCase()}
          </p>
          <p className="text-xs text-gray-400">{issuedDate}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={expanded ? 'Contraer' : 'Expandir'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Items (always show a summary) */}
      <div className="px-3 py-2 space-y-1.5">
        {prescription.items.slice(0, expanded ? undefined : 2).map((item) => (
          <div key={item.id} className="text-xs">
            <span className="font-medium text-gray-800">{item.medication}</span>
            <span className="text-gray-500">
              {' '}· {item.dosage} · {item.frequency} · {item.duration_days} día{item.duration_days !== 1 ? 's' : ''}
            </span>
            {item.notes && (
              <span className="text-gray-400"> ({item.notes})</span>
            )}
          </div>
        ))}

        {!expanded && prescription.items.length > 2 && (
          <p className="text-xs text-gray-400">
            +{prescription.items.length - 2} más...
          </p>
        )}

        {expanded && prescription.instructions && (
          <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
            <span className="font-medium">Indicaciones:</span> {prescription.instructions}
          </p>
        )}
      </div>

      {/* Download button */}
      <div className="px-3 py-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {downloading ? (
            <Spinner size="sm" className="h-3 w-3" />
          ) : (
            <Download size={13} />
          )}
          Descargar PDF
        </button>
      </div>
    </div>
  )
}
