import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useRecords } from '../hooks/useRecords'
import type { Consultation } from '../hooks/useRecords'

const STATUS_LABELS: Record<string, string> = {
  pending:     'Pendiente',
  confirmed:   'Confirmada',
  in_progress: 'En curso',
  completed:   'Completada',
  cancelled:   'Cancelada',
  no_show:     'No asistió',
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending:     'warning',
  confirmed:   'info',
  in_progress: 'info',
  completed:   'success',
  cancelled:   'danger',
  no_show:     'danger',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd MMM yyyy', { locale: es })
  } catch {
    return '—'
  }
}

function truncate(text: string, maxLen = 60): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

export default function RecordsPage() {
  const navigate      = useNavigate()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useRecords({ page, limit: 20 })

  const consultations = data?.data ?? []
  const meta          = data?.meta

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Historial clínico</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Todas las consultas registradas
          {meta ? ` · ${meta.total} en total` : ''}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-base border border-gray-200 overflow-hidden overflow-x-auto">
        {consultations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText size={36} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Sin consultas registradas</p>
            <p className="text-gray-400 text-sm mt-1">
              Las consultas aparecerán aquí cuando se registren.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Paciente
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Médico
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Motivo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  CIE-10
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {consultations.map((c: Consultation) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/appointments/${c.appointment_id}/consultation`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatDate(c.appointment.scheduled_at)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">
                      {c.appointment.patient.last_name},{' '}
                      {c.appointment.patient.first_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      DNI {c.appointment.patient.dni}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <p>
                      Dr. {c.appointment.doctor.user.first_name}{' '}
                      {c.appointment.doctor.user.last_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {c.appointment.doctor.specialty}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs">
                    {truncate(c.chief_complaint)}
                  </td>
                  <td className="px-4 py-3">
                    {c.icd10_code ? (
                      <span className="font-mono text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {c.icd10_code}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={STATUS_VARIANTS[c.appointment.status] ?? 'default'}
                    >
                      {STATUS_LABELS[c.appointment.status] ?? c.appointment.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Página {meta.page} de {meta.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page <= 1}
              className="p-1.5 rounded-base border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={meta.page >= meta.totalPages}
              className="p-1.5 rounded-base border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
