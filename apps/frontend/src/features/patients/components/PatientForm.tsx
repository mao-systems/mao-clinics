import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { differenceInYears, parseISO } from 'date-fns'
import type { Patient } from '@mao-systems/shared'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreatePatient, useUpdatePatient } from '../hooks/usePatients'

const LIMA_DISTRICTS = [
  'Miraflores', 'San Borja', 'San Isidro', 'Surco', 'La Molina',
  'Magdalena', 'Pueblo Libre', 'Jesús María', 'Lince', 'San Miguel',
  'Barranco', 'Chorrillos', 'San Juan de Miraflores', 'Villa El Salvador',
  'San Juan de Lurigancho', 'Los Olivos', 'Otros',
]

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const

const formSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos'),
  first_name: z.string().min(1, 'Requerido').max(100),
  last_name: z.string().min(1, 'Requerido').max(100),
  date_of_birth: z.string().min(1, 'Requerido'),
  sex: z.enum(['M', 'F', 'Other'], { required_error: 'Requerido' }),
  blood_type: z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).optional().or(z.literal('')),
  phone: z
    .string()
    .refine((v) => !v || /^9\d{8}$/.test(v), 'Debe tener 9 dígitos y comenzar con 9')
    .optional(),
  email: z
    .string()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Correo electrónico inválido')
    .optional(),
  address: z.string().max(200).optional(),
  district: z.string().optional(),
  allergies: z.string().max(500).optional(),
  medical_history: z.string().max(2000).optional(),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: z
    .string()
    .refine((v) => !v || /^9\d{8}$/.test(v), 'Debe tener 9 dígitos y comenzar con 9')
    .optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PatientFormProps {
  patient?: Patient | null
  onClose: () => void
}

// Convert empty strings to null for nullable backend fields
function cleanPayload(values: FormValues) {
  const toNull = (v: string | undefined) => (v === '' || v === undefined ? null : v)
  return {
    ...values,
    date_of_birth: values.date_of_birth ? `${values.date_of_birth}T00:00:00.000Z` : null,
    sex: values.sex ?? null,
    blood_type: (values.blood_type || null) as Patient['blood_type'],
    phone: toNull(values.phone),
    email: toNull(values.email),
    address: toNull(values.address),
    district: toNull(values.district),
    allergies: toNull(values.allergies),
    medical_history: toNull(values.medical_history),
    emergency_contact_name: toNull(values.emergency_contact_name),
    emergency_contact_phone: toNull(values.emergency_contact_phone),
  }
}

function getDefaultDate(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  try {
    return parseISO(isoDate).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export function PatientForm({ patient, onClose }: PatientFormProps) {
  const isEdit = !!patient
  const [medicalOpen, setMedicalOpen] = useState(false)
  const createMutation = useCreatePatient()
  const updateMutation = useUpdatePatient()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dni: patient?.dni ?? '',
      first_name: patient?.first_name ?? '',
      last_name: patient?.last_name ?? '',
      date_of_birth: getDefaultDate(patient?.date_of_birth),
      sex: patient?.sex ?? undefined,
      blood_type: patient?.blood_type ?? undefined,
      phone: patient?.phone ?? '',
      email: patient?.email ?? '',
      address: patient?.address ?? '',
      district: patient?.district ?? '',
      allergies: patient?.allergies ?? '',
      medical_history: patient?.medical_history ?? '',
      emergency_contact_name: patient?.emergency_contact_name ?? '',
      emergency_contact_phone: patient?.emergency_contact_phone ?? '',
    },
  })

  const dobValue = watch('date_of_birth')
  const computedAge = dobValue
    ? (() => {
        try {
          return differenceInYears(new Date(), parseISO(dobValue))
        } catch {
          return null
        }
      })()
    : null

  const isPending = createMutation.isPending || updateMutation.isPending

  async function onSubmit(values: FormValues) {
    const payload = cleanPayload(values)
    if (isEdit && patient) {
      await updateMutation.mutateAsync({ id: patient.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload as Partial<Patient>)
    }
    onClose()
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar paciente' : 'Registrar paciente'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-6">

          {/* ── Datos personales ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Datos personales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="DNI *"
                type="text"
                maxLength={8}
                inputMode="numeric"
                error={errors.dni?.message}
                {...register('dni')}
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Fecha de nacimiento *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className={[
                      'flex-1 px-3 py-2 border text-sm rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                      errors.date_of_birth ? 'border-red-400' : 'border-gray-300',
                    ].join(' ')}
                    {...register('date_of_birth')}
                  />
                  {computedAge !== null && (
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {computedAge} años
                    </span>
                  )}
                </div>
                {errors.date_of_birth && (
                  <p className="text-xs text-red-500">{errors.date_of_birth.message}</p>
                )}
              </div>

              <Input
                label="Nombres *"
                error={errors.first_name?.message}
                {...register('first_name')}
              />
              <Input
                label="Apellidos *"
                error={errors.last_name?.message}
                {...register('last_name')}
              />

              {/* Sexo */}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">Sexo *</span>
                <div className="flex gap-3">
                  {([['M', 'Masculino'], ['F', 'Femenino'], ['Other', 'Otro']] as const).map(
                    ([val, label]) => (
                      <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" value={val} {...register('sex')} className="accent-primary" />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ),
                  )}
                </div>
                {errors.sex && (
                  <p className="text-xs text-red-500">{errors.sex.message}</p>
                )}
              </div>

              {/* Tipo de sangre */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Tipo de sangre</label>
                <select
                  className="px-3 py-2 border border-gray-300 text-sm rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  {...register('blood_type')}
                >
                  <option value="">Seleccionar...</option>
                  {BLOOD_TYPES.map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Contacto ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Contacto
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Teléfono"
                type="tel"
                inputMode="numeric"
                placeholder="9XXXXXXXX"
                maxLength={9}
                error={errors.phone?.message}
                {...register('phone')}
              />
              <Input
                label="Correo electrónico"
                type="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Dirección"
                error={errors.address?.message}
                {...register('address')}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Distrito</label>
                <select
                  className="px-3 py-2 border border-gray-300 text-sm rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  {...register('district')}
                >
                  <option value="">Seleccionar distrito...</option>
                  {LIMA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Información médica (collapsible) ── */}
          <section>
            <button
              type="button"
              onClick={() => setMedicalOpen((o) => !o)}
              className="flex w-full items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-600 transition-colors"
            >
              <span>Información médica</span>
              {medicalOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {medicalOpen && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Alergias</label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Penicilina, látex..."
                    className="px-3 py-2 border border-gray-300 text-sm rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    {...register('allergies')}
                  />
                  {errors.allergies && (
                    <p className="text-xs text-red-500">{errors.allergies.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Antecedentes médicos</label>
                  <textarea
                    rows={3}
                    placeholder="Ej: Hipertensión, diabetes tipo 2..."
                    className="px-3 py-2 border border-gray-300 text-sm rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    {...register('medical_history')}
                  />
                  {errors.medical_history && (
                    <p className="text-xs text-red-500">{errors.medical_history.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Contacto de emergencia (nombre)"
                    error={errors.emergency_contact_name?.message}
                    {...register('emergency_contact_name')}
                  />
                  <Input
                    label="Contacto de emergencia (teléfono)"
                    type="tel"
                    inputMode="numeric"
                    placeholder="9XXXXXXXX"
                    maxLength={9}
                    error={errors.emergency_contact_phone?.message}
                    {...register('emergency_contact_phone')}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEdit ? 'Guardar cambios' : 'Guardar paciente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
