import { Pencil, Power } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { DAY_SHORT } from './ScheduleEditor'
import type { DoctorWithRelations } from '../hooks/useAdminDoctors'

interface Props {
  doctor:   DoctorWithRelations
  onEdit:   () => void
  onToggle: () => void
}

export function DoctorCard({ doctor, onEdit, onToggle }: Props) {
  const { user, specialty, cmp, consultation_duration, active, schedules } = doctor

  const fullName    = `${user.first_name} ${user.last_name}`
  const initials    = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
  const activeDays  = schedules.filter(s => s.active).map(s => s.day_of_week)

  return (
    <div className={`bg-white border rounded-base p-4 flex flex-col gap-3 transition-opacity ${!active ? 'opacity-70' : ''}`}
         style={{ borderColor: active ? 'var(--color-primary)20' : '#E5E7EB' }}>

      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
          style={{ backgroundColor: active ? 'var(--color-primary)' : '#9CA3AF' }}
        >
          {initials}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-800 truncate">Dr. {fullName}</p>
            <Badge variant={active ? 'success' : 'default'}>
              {active ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{specialty}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-gray-100 transition-colors"
            title="Editar médico"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onToggle}
            className={`p-1.5 rounded transition-colors ${
              active
                ? 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
                : 'text-gray-400 hover:text-green-600 hover:bg-gray-100'
            }`}
            title={active ? 'Desactivar' : 'Activar'}
          >
            <Power size={14} />
          </button>
        </div>
      </div>

      {/* Details row */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {cmp && <span>CMP {cmp}</span>}
        <span>{consultation_duration} min/consulta</span>
      </div>

      {/* Schedule pills */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 7 }, (_, i) => {
          const isActive = activeDays.includes(i)
          return (
            <span
              key={i}
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
              style={isActive ? { backgroundColor: 'var(--color-primary)' } : {}}
            >
              {DAY_SHORT[i]}
            </span>
          )
        })}
      </div>

      {/* Pending password change notice */}
      {user.must_change_password && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
          El médico aún no ha cambiado su contraseña temporal
        </p>
      )}
    </div>
  )
}
