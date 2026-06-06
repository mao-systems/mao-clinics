import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Pill,
  Receipt,
  Calendar,
  Clock,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Patient } from '@mao-systems/shared'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { usePatient, usePatientHistory } from '../hooks/usePatients'
import { PatientForm } from '../components/PatientForm'
import {
  formatAge,
  formatDNI,
  formatPhone,
  getBloodTypeColor,
  getPatientInitials,
  getSexLabel,
} from '../utils/patient.utils'
import type { AppointmentWithDetails, InvoiceWithItems } from '../hooks/usePatients'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es })
  } catch {
    return '—'
  }
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd MMM yyyy', { locale: es })
  } catch {
    return '—'
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No se presentó',
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'danger',
}

// ── Info field ────────────────────────────────────────────────────────────────
function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 bg-gray-100 rounded-base" />
      <div className="h-10 bg-gray-100 rounded-base" />
      <div className="h-64 bg-gray-100 rounded-base" />
    </div>
  )
}

// ── Tab 1: Datos personales ───────────────────────────────────────────────────
function PersonalDataTab({ patient }: { patient: Patient }) {
  return (
    <div className="space-y-6 pt-4">
      {/* Identificación */}
      <section>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Identificación
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoField label="DNI" value={formatDNI(patient.dni)} />
          <InfoField label="Nombre completo" value={`${patient.first_name} ${patient.last_name}`} />
          <InfoField label="Fecha de nacimiento" value={formatDate(patient.date_of_birth)} />
          <InfoField label="Edad" value={formatAge(patient.date_of_birth)} />
          <InfoField label="Sexo" value={getSexLabel(patient.sex)} />
          <InfoField label="Tipo de sangre" value={patient.blood_type ?? undefined} />
        </div>
      </section>

      {/* Contacto */}
      <section>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Contacto
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoField label="Teléfono" value={formatPhone(patient.phone)} />
          <InfoField label="Correo electrónico" value={patient.email ?? undefined} />
          <InfoField label="Dirección" value={patient.address ?? undefined} />
          <InfoField label="Distrito" value={patient.district ?? undefined} />
        </div>
      </section>

      {/* Información médica */}
      <section>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Información médica
        </h4>
        <div className="space-y-3">
          <InfoField label="Alergias" value={patient.allergies ?? undefined} />
          <InfoField label="Antecedentes médicos" value={patient.medical_history ?? undefined} />
        </div>
      </section>

      {/* Contacto de emergencia */}
      <section>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Contacto de emergencia
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Nombre" value={patient.emergency_contact_name ?? undefined} />
          <InfoField label="Teléfono" value={formatPhone(patient.emergency_contact_phone)} />
        </div>
      </section>
    </div>
  )
}

// ── Tab 2: Historial médico ───────────────────────────────────────────────────
function MedicalHistoryTab({ patientId }: { patientId: string }) {
  const { data, isLoading } = usePatientHistory(patientId)

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-base" />
        ))}
      </div>
    )
  }

  if (!data || data.appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Sin historial médico registrado</p>
        <p className="text-gray-400 text-sm mt-1">
          Las consultas aparecerán aquí cuando se registren citas.
        </p>
      </div>
    )
  }

  // Map invoices by consultation_id for quick lookup
  const invoiceByConsultation = new Map<string, InvoiceWithItems>()
  for (const inv of data.invoices) {
    if (inv.consultation_id) invoiceByConsultation.set(inv.consultation_id, inv)
  }

  return (
    <div className="pt-4 space-y-3">
      {data.appointments.map((appt: AppointmentWithDetails) => {
        const relatedInvoice = appt.consultation
          ? invoiceByConsultation.get(appt.consultation.id)
          : undefined

        return (
          <div
            key={appt.id}
            className="border border-gray-200 rounded-base p-4 hover:border-gray-300 transition-colors"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {formatShortDate(appt.scheduled_at)}
                </p>
                <p className="text-xs text-gray-500">
                  Dr. {appt.doctor.user.first_name} {appt.doctor.user.last_name} ·{' '}
                  {appt.doctor.specialty}
                </p>
              </div>
              <Badge variant={STATUS_VARIANTS[appt.status] ?? 'default'}>
                {STATUS_LABELS[appt.status] ?? appt.status}
              </Badge>
            </div>

            {/* Consultation details */}
            {appt.consultation && (
              <div className="mt-2 pl-3 border-l-2 border-gray-100 space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Motivo:</span> {appt.consultation.chief_complaint}
                </p>
                {appt.consultation.icd10_code && (
                  <p className="text-xs text-gray-500">
                    CIE-10: {appt.consultation.icd10_code}{' '}
                    {appt.consultation.icd10_description && `— ${appt.consultation.icd10_description}`}
                  </p>
                )}
                {appt.consultation.diagnosis && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Diagnóstico:</span> {appt.consultation.diagnosis}
                  </p>
                )}
              </div>
            )}

            {/* Footer pills */}
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {appt.consultation && appt.consultation.prescriptions.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <Pill size={11} />
                  Ver receta ({appt.consultation.prescriptions.length})
                </span>
              )}
              {relatedInvoice && (
                <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  <Receipt size={11} />
                  {relatedInvoice.series}-{String(relatedInvoice.number).padStart(8, '0')} · S/{' '}
                  {relatedInvoice.total}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} />
                {appt.duration_min} min
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tab 3: Próximas citas ─────────────────────────────────────────────────────
function UpcomingAppointmentsTab({ patientId }: { patientId: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = usePatientHistory(patientId)

  const upcoming = (data?.appointments ?? []).filter(
    (a) => a.status === 'pending' || a.status === 'confirmed',
  )

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4 animate-pulse">
        <div className="h-16 bg-gray-100 rounded-base" />
        <div className="h-16 bg-gray-100 rounded-base" />
      </div>
    )
  }

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Sin citas próximas</p>
        <Button
          size="sm"
          variant="ghost"
          className="mt-4"
          onClick={() => navigate('/appointments')}
        >
          Agendar cita
        </Button>
      </div>
    )
  }

  return (
    <div className="pt-4 space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => navigate('/appointments')}>
          Agendar cita
        </Button>
      </div>
      {upcoming.map((appt: AppointmentWithDetails) => (
        <div
          key={appt.id}
          className="flex items-center justify-between p-4 border border-gray-200 rounded-base"
        >
          <div>
            <p className="text-sm font-medium text-gray-800">
              {formatShortDate(appt.scheduled_at)}
            </p>
            <p className="text-xs text-gray-500">
              Dr. {appt.doctor.user.first_name} {appt.doctor.user.last_name} · {appt.duration_min}{' '}
              min
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[appt.status] ?? 'default'}>
            {STATUS_LABELS[appt.status] ?? appt.status}
          </Badge>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = ['Datos personales', 'Historial médico', 'Próximas citas'] as const
type Tab = (typeof TABS)[number]

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'receptionist'

  const [activeTab, setActiveTab] = useState<Tab>('Datos personales')
  const [showEditForm, setShowEditForm] = useState(false)

  const { data: patient, isLoading } = usePatient(id ?? '')

  if (isLoading) return <PageSkeleton />

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-500">Paciente no encontrado</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate('/patients')}>
          Volver a pacientes
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate('/patients')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft size={15} />
        Volver a pacientes
      </button>

      {/* Header card */}
      <div className="bg-white rounded-base border border-gray-200 p-4 md:p-6 mb-4">
        <div className="flex items-start gap-3 md:gap-5">
          {/* Large avatar */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {getPatientInitials(patient)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h1>

            <div className="flex items-center flex-wrap gap-2 mt-2">
              <Badge variant="default">DNI {formatDNI(patient.dni)}</Badge>
              <Badge variant="default">{formatAge(patient.date_of_birth)}</Badge>
              {patient.blood_type && (
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: getBloodTypeColor(patient.blood_type) }}
                >
                  {patient.blood_type}
                </span>
              )}
              {patient.sex && (
                <Badge variant="info">{getSexLabel(patient.sex)}</Badge>
              )}
            </div>
          </div>

          {/* Edit button */}
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowEditForm(true)}
              className="flex-shrink-0"
            >
              <Pencil size={14} className="mr-1.5" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-base border border-gray-200">
        {/* Tab bar — scrollable on mobile */}
        <div className="overflow-x-auto border-b border-gray-200">
          <div className="flex px-4 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  'py-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 md:p-6">
          {activeTab === 'Datos personales' && <PersonalDataTab patient={patient} />}
          {activeTab === 'Historial médico' && id && <MedicalHistoryTab patientId={id} />}
          {activeTab === 'Próximas citas' && id && <UpcomingAppointmentsTab patientId={id} />}
        </div>
      </div>

      {/* Edit modal */}
      {showEditForm && (
        <PatientForm patient={patient} onClose={() => setShowEditForm(false)} />
      )}
    </div>
  )
}
