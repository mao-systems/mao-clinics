import { STATUS_COLORS } from '../constants/appointments.constants'
import type { AppointmentStatus } from '../constants/appointments.constants'

interface AppointmentStatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export function AppointmentStatusBadge({
  status,
  size = 'md',
}: AppointmentStatusBadgeProps) {
  const colors = STATUS_COLORS[status as AppointmentStatus] ?? STATUS_COLORS.pending

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      ].join(' ')}
      style={{ backgroundColor: colors.bg + '20', color: colors.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: colors.bg }}
      />
      {colors.label}
    </span>
  )
}
