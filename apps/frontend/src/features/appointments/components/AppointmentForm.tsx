import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, X, Search, Info, CalendarX } from 'lucide-react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useDebounce } from '@/hooks/useDebounce'
import { usePatients } from '@/features/patients/hooks/usePatients'
import { PatientCard } from '@/features/patients/components/PatientCard'
import {
  useAvailability,
  useCreateAppointment,
  useUpdateAppointment,
  useDoctors,
} from '../hooks/useAppointments'
import type { AppointmentWithRelations, DoctorSummary } from '../hooks/useAppointments'
import { toLimaDate } from '../utils/appointments.utils'

dayjs.extend(utc)
dayjs.extend(timezone)

const LIMA_TZ = 'America/Lima'

const DURATION_OPTIONS = [10, 15, 20, 25, 30, 45, 60, 90, 120]

const formSchema = z.object({
  doctor_id:    z.string().min(1, 'Selecciona un médico'),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  duration_min: z.coerce.number().int().min(10).max(120),
  reason:       z.string().max(500).optional(),
  notes:        z.string().max(1000).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PatientSummary {
  id: string
  first_name: string
  last_name: string
  dni: string
}

interface AppointmentFormProps {
  appointment?:  AppointmentWithRelations | null
  defaultDate?:  Date | null
  onClose:       () => void
}

function todayLima(): string {
  return dayjs().tz(LIMA_TZ).format('YYYY-MM-DD')
}

export function AppointmentForm({
  appointment,
  defaultDate,
  onClose,
}: AppointmentFormProps) {
  const isEdit = !!appointment
  const createMutation = useCreateAppointment()
  const updateMutation = useUpdateAppointment()
  const { data: doctors = [] } = useDoctors()

  // ── Patient selector state ──────────────────────────────────────────────────
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(
    appointment
      ? {
          id: appointment.patient_id,
          first_name: appointment.patient.first_name,
          last_name:  appointment.patient.last_name,
          dni:        appointment.patient.dni,
        }
      : null,
  )
  const [patientSearch, setPatientSearch]         = useState('')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [patientError, setPatientError]           = useState('')
  const debouncedSearch = useDebounce(patientSearch, 300)

  const patientsQuery = usePatients(
    debouncedSearch.length >= 2 ? { q: debouncedSearch, limit: 8 } : {},
  )

  // ── Slot state ──────────────────────────────────────────────────────────────
  const [selectedSlotUtc, setSelectedSlotUtc] = useState<string | null>(
    appointment?.scheduled_at ?? null,
  )
  const [slotError, setSlotError] = useState('')

  // ── Form ────────────────────────────────────────────────────────────────────
  const defaultDateStr = useMemo(() => {
    if (appointment?.scheduled_at) return toLimaDate(appointment.scheduled_at)
    if (defaultDate) return dayjs(defaultDate).tz(LIMA_TZ).format('YYYY-MM-DD')
    return todayLima()
  }, [appointment, defaultDate])

  const defaultDoctorDuration = useMemo(() => {
    if (!appointment) return 30
    const doc = doctors.find((d) => d.id === appointment.doctor_id)
    return doc?.consultation_duration ?? appointment.duration_min
  }, [appointment, doctors])

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        doctor_id:    appointment?.doctor_id ?? '',
        date:         defaultDateStr,
        duration_min: appointment?.duration_min ?? defaultDoctorDuration,
        reason:       appointment?.reason ?? '',
        notes:        appointment?.notes  ?? '',
      },
    })

  const watchedDoctorId    = watch('doctor_id')
  const watchedDate        = watch('date')
  const watchedDuration    = watch('duration_min')

  // Auto-fill duration when doctor changes
  useEffect(() => {
    if (!isEdit && watchedDoctorId) {
      const doc = doctors.find((d: DoctorSummary) => d.id === watchedDoctorId)
      if (doc) setValue('duration_min', doc.consultation_duration)
    }
  }, [watchedDoctorId, doctors, isEdit, setValue])

  // Reset slot selection when doctor/date/duration change
  useEffect(() => {
    if (!isEdit) setSelectedSlotUtc(null)
  }, [watchedDoctorId, watchedDate, watchedDuration, isEdit])

  const { data: slots, isLoading: slotsLoading } = useAvailability(
    watchedDoctorId,
    watchedDate,
    Number(watchedDuration),
  )

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    if (!selectedPatient) { setPatientError('Selecciona un paciente'); return }
    if (!selectedSlotUtc) { setSlotError('Selecciona un horario disponible'); return }

    setPatientError('')
    setSlotError('')

    const payload = {
      patient_id:   selectedPatient.id,
      doctor_id:    values.doctor_id,
      scheduled_at: selectedSlotUtc,
      duration_min: Number(values.duration_min),
      reason:       values.reason || null,
      notes:        values.notes  || null,
    }

    if (isEdit && appointment) {
      await updateMutation.mutateAsync({ id: appointment.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar cita' : 'Nueva cita'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-6">

          {/* ── Paso 1: Paciente ── */}
          <section>
            <SectionTitle>1. Paciente</SectionTitle>

            {selectedPatient ? (
              <div className="relative">
                <PatientCard patient={selectedPatient as never} />
                <button
                  type="button"
                  onClick={() => { setSelectedPatient(null); setPatientSearch('') }}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm border border-gray-200"
                  title="Cambiar paciente"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      setShowPatientDropdown(true)
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    placeholder="Buscar paciente por nombre o DNI..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {showPatientDropdown && debouncedSearch.length >= 2 && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowPatientDropdown(false)}
                    />
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-base shadow-lg max-h-48 overflow-y-auto">
                      {patientsQuery.isLoading && (
                        <div className="p-3 text-center">
                          <Spinner size="sm" />
                        </div>
                      )}
                      {!patientsQuery.isLoading &&
                        (patientsQuery.data?.data ?? []).length === 0 && (
                          <p className="p-3 text-sm text-gray-400 text-center">
                            No se encontraron pacientes
                          </p>
                        )}
                      {(patientsQuery.data?.data ?? []).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatient({
                              id:         p.id,
                              first_name: p.first_name,
                              last_name:  p.last_name,
                              dni:        p.dni,
                            })
                            setShowPatientDropdown(false)
                            setPatientSearch('')
                            setPatientError('')
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-left transition-colors"
                        >
                          <span className="text-sm font-medium text-gray-800">
                            {p.first_name} {p.last_name}
                          </span>
                          <span className="text-xs text-gray-400">{p.dni}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {patientError && (
                  <p className="mt-1 text-xs text-red-500">{patientError}</p>
                )}
              </div>
            )}
          </section>

          {/* ── Paso 2: Médico y horario ── */}
          <section>
            <SectionTitle>2. Médico y horario</SectionTitle>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Doctor */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Médico *</label>
                <select
                  className={[
                    'px-3 py-2 border text-sm rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary',
                    errors.doctor_id ? 'border-red-500' : 'border-gray-300',
                  ].join(' ')}
                  {...register('doctor_id')}
                >
                  <option value="">Seleccionar médico...</option>
                  {doctors.map((d: DoctorSummary) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.user.last_name} · {d.specialty}
                    </option>
                  ))}
                </select>
                {errors.doctor_id && (
                  <p className="text-xs text-red-500">{errors.doctor_id.message}</p>
                )}
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Fecha *</label>
                <input
                  type="date"
                  min={todayLima()}
                  className={[
                    'px-3 py-2 border text-sm rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary',
                    errors.date ? 'border-red-500' : 'border-gray-300',
                  ].join(' ')}
                  {...register('date')}
                />
                {errors.date && (
                  <p className="text-xs text-red-500">{errors.date.message}</p>
                )}
              </div>

              {/* Duration */}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-sm font-medium text-gray-700">Duración</label>
                <select
                  className="px-3 py-2 border border-gray-300 text-sm rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary w-40"
                  {...register('duration_min')}
                >
                  {DURATION_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} minutos
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time slot selector */}
            {watchedDoctorId && watchedDate && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Horario disponible
                </p>

                {/* Loading skeleton */}
                {slotsLoading && (
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="h-9 bg-gray-100 rounded-base animate-pulse" />
                    ))}
                  </div>
                )}

                {/* Doctor does not work on this day */}
                {!slotsLoading && slots && !slots.available && (
                  <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-base">
                    <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800">{slots.message}</p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        Selecciona otra fecha para ver disponibilidad.
                      </p>
                    </div>
                  </div>
                )}

                {/* Doctor works this day but all slots are occupied */}
                {!slotsLoading && slots?.available && slots.slots.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 border border-dashed border-gray-200 rounded-base text-center">
                    <CalendarX size={22} className="text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Sin disponibilidad para este día</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Todas las horas están ocupadas. Prueba con otra fecha.
                    </p>
                  </div>
                )}

                {/* Slot grid */}
                {!slotsLoading && slots?.available && slots.slots.length > 0 && (
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                    {slots.slots.map((slot) => {
                      const isSelected    = selectedSlotUtc === slot.scheduled_at
                      const isCurrentEdit = isEdit && appointment?.scheduled_at === slot.scheduled_at

                      if (!slot.available && !isCurrentEdit) {
                        return (
                          <div
                            key={slot.scheduled_at}
                            className="flex items-center justify-center h-9 text-xs bg-gray-50 text-gray-300 border border-gray-100 rounded-base cursor-not-allowed"
                            title="Ocupado"
                          >
                            <Lock size={10} className="mr-0.5" />
                            {slot.time}
                          </div>
                        )
                      }

                      return (
                        <button
                          key={slot.scheduled_at}
                          type="button"
                          onClick={() => {
                            setSelectedSlotUtc(slot.scheduled_at)
                            setSlotError('')
                          }}
                          className={[
                            'h-9 text-xs font-medium rounded-base border transition-all',
                            isSelected
                              ? 'text-white border-transparent'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary',
                          ].join(' ')}
                          style={isSelected ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
                        >
                          {slot.time}
                        </button>
                      )
                    })}
                  </div>
                )}

                {slotError && (
                  <p className="mt-1 text-xs text-red-500">{slotError}</p>
                )}
              </div>
            )}
          </section>

          {/* ── Paso 3: Motivo ── */}
          <section>
            <SectionTitle>3. Motivo (opcional)</SectionTitle>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Motivo de consulta
                </label>
                <textarea
                  rows={2}
                  placeholder="¿Por qué viene el paciente?"
                  className="px-3 py-2 border border-gray-300 text-sm rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  {...register('reason')}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Notas internas
                </label>
                <textarea
                  rows={2}
                  placeholder="Notas visibles solo para el equipo médico"
                  className="px-3 py-2 border border-gray-300 text-sm rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  {...register('notes')}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEdit ? 'Guardar cambios' : 'Confirmar cita'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
      {children}
    </h3>
  )
}
