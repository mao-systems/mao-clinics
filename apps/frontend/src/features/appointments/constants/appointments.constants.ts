export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export const STATUS_COLORS: Record<
  AppointmentStatus,
  { bg: string; text: string; label: string }
> = {
  pending:     { bg: '#3B82F6', text: '#FFFFFF', label: 'Pendiente' },
  confirmed:   { bg: '#10B981', text: '#FFFFFF', label: 'Confirmada' },
  in_progress: { bg: '#F59E0B', text: '#FFFFFF', label: 'En curso' },
  completed:   { bg: '#6B7280', text: '#FFFFFF', label: 'Completada' },
  cancelled:   { bg: '#EF4444', text: '#FFFFFF', label: 'Cancelada' },
  no_show:     { bg: '#F97316', text: '#FFFFFF', label: 'No asistió' },
}

export const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed:   ['no_show'],
  cancelled:   [],
  no_show:     [],
}

export const LIMA_DISTRICTS = [
  'Todos los distritos',
  'Miraflores',
  'San Borja',
  'San Isidro',
  'Surco',
  'La Molina',
  'Magdalena',
  'Pueblo Libre',
  'Jesús María',
  'Lince',
  'San Miguel',
  'Barranco',
  'Chorrillos',
  'San Juan de Miraflores',
  'Villa El Salvador',
  'San Juan de Lurigancho',
  'Los Olivos',
  'Otros',
]
