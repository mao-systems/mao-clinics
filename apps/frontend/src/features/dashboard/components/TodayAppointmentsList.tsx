import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { RefreshCw, Calendar, MessageCircle } from 'lucide-react'
import { AppointmentStatusBadge } from '@/features/appointments/components/AppointmentStatusBadge'
import { Button } from '@/components/ui/Button'
import type { TodayAppointment } from '../hooks/useDashboard'

interface TodayAppointmentsListProps {
  appointments: TodayAppointment[]
  isLoading:    boolean
  onRefresh?:   () => void
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 animate-pulse last:border-0">
      <div className="w-12 h-10 bg-gray-200 rounded flex-shrink-0" />
      <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-gray-200 rounded w-36" />
        <div className="h-3 bg-gray-200 rounded w-24" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-24 flex-shrink-0" />
      <div className="h-5 bg-gray-200 rounded-full w-20 flex-shrink-0" />
    </div>
  )
}

export function TodayAppointmentsList({
  appointments,
  isLoading,
  onRefresh,
}: TodayAppointmentsListProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-base border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">Citas de hoy</h3>
          {!isLoading && (
            <span
              className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {appointments.length}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-base transition-colors disabled:opacity-40"
          title="Actualizar"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-2">
        {isLoading ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        ) : appointments.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <Calendar size={36} className="text-gray-300" />
            <p className="text-sm text-gray-500">No hay citas programadas para hoy</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/appointments')}
            >
              Agendar cita
            </Button>
          </div>
        ) : (
          <div>
            {appointments.map((appt) => {
              const scheduledDate  = new Date(appt.scheduled_at)
              const timeStr        = format(scheduledDate, 'hh:mm a')
              const patientName    = `${appt.patient.first_name} ${appt.patient.last_name}`
              const doctorFullName = `${appt.doctor.user.first_name} ${appt.doctor.user.last_name}`
              const initials       = getInitials(appt.patient.first_name, appt.patient.last_name)

              return (
                <button
                  key={appt.id}
                  onClick={() => navigate('/appointments')}
                  className="w-full flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-base transition-colors text-left"
                >
                  {/* Time */}
                  <div className="w-14 flex-shrink-0 text-center">
                    <span
                      className="text-sm font-bold block"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {timeStr}
                    </span>
                  </div>

                  {/* Patient avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {initials}
                  </div>

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{patientName}</p>
                    <p className="text-xs text-gray-400 truncate">DNI {appt.patient.dni}</p>
                  </div>

                  {/* Doctor + specialty */}
                  <div className="hidden sm:flex flex-col items-end flex-shrink-0 min-w-0 max-w-[160px]">
                    <p className="text-xs font-medium text-gray-700 truncate">Dr. {doctorFullName}</p>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full mt-0.5"
                      style={{
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {appt.doctor.specialty}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    <AppointmentStatusBadge status={appt.status} size="sm" />
                  </div>

                  {/* WhatsApp reminder sent indicator */}
                  {appt.reminder_sent && (
                    <div
                      className="flex items-center gap-0.5 text-emerald-600 flex-shrink-0"
                      title="Recordatorio enviado"
                    >
                      <MessageCircle size={13} />
                      <span className="text-xs font-medium">✓</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
