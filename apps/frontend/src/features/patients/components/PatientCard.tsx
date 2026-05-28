import type { Patient } from '@mao-systems/shared'
import { Badge } from '@/components/ui/Badge'
import {
  formatAge,
  formatDNI,
  getBloodTypeColor,
  getPatientInitials,
} from '../utils/patient.utils'

interface PatientCardProps {
  patient: Patient
  onClick?: () => void
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'flex items-center gap-4 p-4 bg-white rounded-base border border-gray-200',
        onClick ? 'cursor-pointer hover:border-primary hover:shadow-sm transition-all' : '',
      ].join(' ')}
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        {getPatientInitials(patient)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 truncate">
          {patient.first_name} {patient.last_name}
        </p>
        <p className="text-sm text-gray-500">DNI {formatDNI(patient.dni)}</p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm text-gray-500">{formatAge(patient.date_of_birth)}</span>
        {patient.blood_type && (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: getBloodTypeColor(patient.blood_type) }}
          >
            {patient.blood_type}
          </span>
        )}
      </div>
    </div>
  )
}
