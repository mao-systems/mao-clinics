import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ExternalLink, Pencil, Clock, User, Stethoscope, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useUpdateAppointmentStatus } from '../hooks/useAppointments'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import {
  formatAppointmentTime,
  getNextValidStatuses,
  getDoctorFullName,
} from '../utils/appointments.utils'
import {
  STATUS_COLORS,
} from '../constants/appointments.constants'
import type { AppointmentStatus } from '../constants/appointments.constants'
import type { AppointmentWithRelations } from '../hooks/useAppointments'

interface AppointmentDetailModalProps {
  appointment: AppointmentWithRelations
  onClose:     () => void
  onEdit:      () => void
}

export function AppointmentDetailModal({
  appointment,
  onClose,
  onEdit,
}: AppointmentDetailModalProps) {
  const navigate = useNavigate()
  const updateStatus = useUpdateAppointmentStatus()
  const [showCancelInput, setShowCancelInput] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const nextStatuses = getNextValidStatuses(appointment.status)

  function handleStatusClick(status: AppointmentStatus) {
    if (status === 'cancelled') {
      setShowCancelInput(true)
      return
    }
    updateStatus.mutate(
      { id: appointment.id, status },
      { onSuccess: onClose },
    )
  }

  function handleConfirmCancel() {
    updateStatus.mutate(
      { id: appointment.id, status: 'cancelled', cancelledReason: cancelReason },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-base shadow-xl w-full max-w-md z-10">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {appointment.patient.last_name}, {appointment.patient.first_name}
            </h2>
            <div className="mt-1">
              <AppointmentStatusBadge status={appointment.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <InfoRow icon={<User size={14} />} label="Médico">
            {getDoctorFullName(appointment.doctor)} · {appointment.doctor.specialty}
          </InfoRow>

          <InfoRow icon={<Clock size={14} />} label="Fecha y hora">
            {formatAppointmentTime(appointment.scheduled_at)}
          </InfoRow>

          <InfoRow icon={<Stethoscope size={14} />} label="Duración">
            {appointment.duration_min} minutos
          </InfoRow>

          <InfoRow icon={<FileText size={14} />} label="Motivo">
            {appointment.reason || '—'}
          </InfoRow>

          {appointment.notes && (
            <InfoRow icon={<FileText size={14} />} label="Notas internas">
              {appointment.notes}
            </InfoRow>
          )}

          {appointment.cancelled_reason && (
            <InfoRow icon={<FileText size={14} />} label="Motivo de cancelación">
              <span className="text-red-600">{appointment.cancelled_reason}</span>
            </InfoRow>
          )}
        </div>

        {/* Status transitions */}
        {nextStatuses.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Cambiar estado
            </p>

            {showCancelInput ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Motivo de cancelación (opcional)"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCancelInput(false)}
                    className="flex-1 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-base hover:bg-gray-50 transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={updateStatus.isPending}
                    className="flex-1 py-1.5 text-xs text-white rounded-base transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    style={{ backgroundColor: STATUS_COLORS.cancelled.bg }}
                  >
                    {updateStatus.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      'Confirmar cancelación'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((status) => {
                  const colors = STATUS_COLORS[status as AppointmentStatus]
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusClick(status as AppointmentStatus)}
                      disabled={updateStatus.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-base text-white transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: colors.bg }}
                    >
                      {updateStatus.isPending && updateStatus.variables?.status === status ? (
                        <Spinner size="sm" />
                      ) : null}
                      {colors.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-base">
          <button
            onClick={() => navigate(`/patients/${appointment.patient_id}`)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors"
          >
            <ExternalLink size={13} />
            Ver en historial
          </button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil size={13} className="mr-1.5" />
            Editar cita
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800">{children}</p>
      </div>
    </div>
  )
}
