import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ScheduleEditor } from './ScheduleEditor'
import {
  useCreateDoctor,
  useUpdateDoctor,
  type DoctorWithRelations,
  type DaySchedule,
  type CreateDoctorData,
} from '../hooks/useAdminDoctors'
import { useAdminSpecialties } from '../hooks/useAdminSpecialties'

const DURATIONS = [10, 15, 20, 25, 30, 45, 60]

// Default Mon–Fri 8–18
function defaultSchedule(): DaySchedule[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    start_time:  '08:00',
    end_time:    '18:00',
    active:      i >= 1 && i <= 5,
  }))
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  first_name:            string
  last_name:             string
  email:                 string
  specialty:             string
  cmp:                   string
  bio:                   string
  consultation_duration: number
  schedule:              DaySchedule[]
}

function initForm(doctor?: DoctorWithRelations): FormState {
  if (!doctor) {
    return {
      first_name:            '',
      last_name:             '',
      email:                 '',
      specialty:             '',
      cmp:                   '',
      bio:                   '',
      consultation_duration: 30,
      schedule:              defaultSchedule(),
    }
  }
  return {
    first_name:            doctor.user.first_name,
    last_name:             doctor.user.last_name,
    email:                 doctor.user.email,
    specialty:             doctor.specialty,
    cmp:                   doctor.cmp ?? '',
    bio:                   doctor.bio ?? '',
    consultation_duration: doctor.consultation_duration,
    schedule:              doctor.schedules.length
      ? Array.from({ length: 7 }, (_, i) =>
          doctor.schedules.find(s => s.day_of_week === i)
          ?? { day_of_week: i, start_time: '08:00', end_time: '18:00', active: false }
        )
      : defaultSchedule(),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  doctor?:  DoctorWithRelations
  onClose:  () => void
}

export function DoctorForm({ doctor, onClose }: Props) {
  const isEdit = !!doctor
  const [form, setForm] = useState<FormState>(() => initForm(doctor))

  const createMutation = useCreateDoctor()
  const updateMutation = useUpdateDoctor()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const { data: specialties = [] } = useAdminSpecialties()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate that all active days have end > start
    const invalid = form.schedule.some(
      s => s.active && s.start_time >= s.end_time
    )
    if (invalid) return  // ScheduleEditor shows inline errors

    const schedule = form.schedule.map(s => ({ ...s }))

    if (isEdit && doctor) {
      updateMutation.mutate(
        {
          id: doctor.id,
          data: {
            first_name:            form.first_name,
            last_name:             form.last_name,
            specialty:             form.specialty,
            cmp:                   form.cmp || null,
            bio:                   form.bio || null,
            consultation_duration: form.consultation_duration,
            schedule,
          },
        },
        { onSuccess: onClose },
      )
    } else {
      const payload: CreateDoctorData = {
        first_name:            form.first_name,
        last_name:             form.last_name,
        email:                 form.email,
        specialty:             form.specialty,
        cmp:                   form.cmp || null,
        bio:                   form.bio || null,
        consultation_duration: form.consultation_duration,
        schedule,
      }
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar médico' : 'Nuevo médico'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Datos personales ──────────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Datos personales
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombres <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                className={inp}
                placeholder="Juan"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Apellidos <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                className={inp}
                placeholder="García López"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  required={!isEdit}
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  disabled={isEdit}
                  className={`${inp} ${isEdit ? 'bg-gray-50 text-gray-400 pr-9 cursor-not-allowed' : ''}`}
                  placeholder="doctor@clinica.pe"
                />
                {isEdit && (
                  <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                )}
              </div>
              {!isEdit && (
                <p className="text-xs text-gray-400 mt-1">
                  Se enviará un email con las credenciales de acceso.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Especialidad <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.specialty}
                onChange={e => set('specialty', e.target.value)}
                className={inp}
              >
                <option value="">Seleccionar especialidad…</option>
                {specialties.filter(s => s.active).map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
                {/* Keep the current value selectable even if it's been deactivated */}
                {form.specialty && !specialties.filter(s => s.active).some(s => s.name === form.specialty) && (
                  <option value={form.specialty}>{form.specialty}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CMP</label>
              <input
                value={form.cmp}
                onChange={e => set('cmp', e.target.value)}
                className={inp}
                placeholder="123456"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Duración de consulta <span className="text-red-500">*</span>
              </label>
              <select
                value={form.consultation_duration}
                onChange={e => set('consultation_duration', Number(e.target.value))}
                className={inp}
              >
                {DURATIONS.map(d => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Biografía ─────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Biografía
          </h3>
          <textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            rows={2}
            maxLength={500}
            className={`${inp} resize-none`}
            placeholder="Breve descripción del médico que puede ser visible para los pacientes…"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{form.bio.length}/500</p>
        </div>

        {/* ── Horario ───────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Horario de atención
          </h3>
          <ScheduleEditor
            value={form.schedule}
            onChange={s => set('schedule', s)}
          />
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isPending}>
              {isEdit ? 'Guardar cambios' : 'Guardar médico'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
