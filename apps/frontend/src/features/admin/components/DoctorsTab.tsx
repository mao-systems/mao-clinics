import { useState } from 'react'
import { Plus, Pencil, Power, User, Clock, Calendar } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useAdminDoctors,
  useCreateDoctor,
  useUpdateDoctor,
  useToggleDoctorActive,
  type AdminDoctor,
  type CreateDoctorPayload,
  type ScheduleEntry,
} from '../hooks/useAdmin'

// ── Day-of-week labels ────────────────────────────────────────────────────────

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const ALL_DAYS   = [0, 1, 2, 3, 4, 5, 6]

// ── Default form state ────────────────────────────────────────────────────────

function emptySchedule(): ScheduleEntry[] {
  return [1, 2, 3, 4, 5].map((d) => ({
    day_of_week: d,
    start_time:  '08:00',
    end_time:    '18:00',
    active:      true,
  }))
}

interface FormState {
  first_name:            string
  last_name:             string
  email:                 string
  specialty:             string
  cmp:                   string
  bio:                   string
  consultation_duration: number
  schedule:              ScheduleEntry[]
}

function emptyForm(): FormState {
  return {
    first_name:            '',
    last_name:             '',
    email:                 '',
    specialty:             '',
    cmp:                   '',
    bio:                   '',
    consultation_duration: 30,
    schedule:              emptySchedule(),
  }
}

function doctorToForm(d: AdminDoctor): FormState {
  return {
    first_name:            d.user.first_name,
    last_name:             d.user.last_name,
    email:                 d.user.email,
    specialty:             d.specialty,
    cmp:                   d.cmp ?? '',
    bio:                   d.bio ?? '',
    consultation_duration: d.consultation_duration,
    schedule:              d.schedules.length ? d.schedules : emptySchedule(),
  }
}

// ── Schedule editor ────────────────────────────────────────────────────────────

function ScheduleEditor({
  schedule,
  onChange,
}: {
  schedule: ScheduleEntry[]
  onChange: (s: ScheduleEntry[]) => void
}) {
  function getEntry(day: number): ScheduleEntry | undefined {
    return schedule.find((s) => s.day_of_week === day)
  }

  function toggleDay(day: number) {
    const existing = getEntry(day)
    if (existing) {
      onChange(schedule.filter((s) => s.day_of_week !== day))
    } else {
      onChange([...schedule, { day_of_week: day, start_time: '08:00', end_time: '18:00', active: true }])
    }
  }

  function updateTime(day: number, field: 'start_time' | 'end_time', value: string) {
    onChange(schedule.map((s) => s.day_of_week === day ? { ...s, [field]: value } : s))
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">Horario semanal</label>
      {ALL_DAYS.map((day) => {
        const entry   = getEntry(day)
        const checked = !!entry
        return (
          <div key={day} className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer w-14">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleDay(day)}
                className="rounded"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span className="text-xs font-medium text-gray-700">{DAY_LABELS[day]}</span>
            </label>
            {checked && entry && (
              <>
                <input
                  type="time"
                  value={entry.start_time}
                  onChange={(e) => updateTime(day, 'start_time', e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1"
                  style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                />
                <span className="text-xs text-gray-400">–</span>
                <input
                  type="time"
                  value={entry.end_time}
                  onChange={(e) => updateTime(day, 'end_time', e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1"
                  style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                />
              </>
            )}
            {!checked && (
              <span className="text-xs text-gray-400 italic">No disponible</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Doctor form modal ─────────────────────────────────────────────────────────

function DoctorFormModal({
  doctor,
  onClose,
}: {
  doctor: AdminDoctor | null
  onClose: () => void
}) {
  const isEdit = !!doctor
  const [form, setForm] = useState<FormState>(doctor ? doctorToForm(doctor) : emptyForm())

  const createMutation = useCreateDoctor()
  const updateMutation = useUpdateDoctor()

  const isPending = createMutation.isPending || updateMutation.isPending

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const schedule = form.schedule.map((s) => ({ ...s, active: true }))

    if (isEdit && doctor) {
      updateMutation.mutate(
        {
          id:   doctor.id,
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
      const payload: CreateDoctorPayload = {
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

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar doctor' : 'Nuevo doctor'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.first_name}
              onChange={(e) => set('first_name', e.target.value)}
              className={inputCls}
              placeholder="Juan"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Apellido <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.last_name}
              onChange={(e) => set('last_name', e.target.value)}
              className={inputCls}
              placeholder="García"
            />
          </div>
        </div>

        {/* Email — only on create */}
        {!isEdit && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputCls}
              placeholder="doctor@clinica.pe"
            />
            <p className="text-xs text-gray-400 mt-1">Se enviará un correo con la contraseña temporal.</p>
          </div>
        )}

        {/* Specialty + CMP */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Especialidad <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.specialty}
              onChange={(e) => set('specialty', e.target.value)}
              className={inputCls}
              placeholder="Medicina General"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">CMP</label>
            <input
              value={form.cmp}
              onChange={(e) => set('cmp', e.target.value)}
              className={inputCls}
              placeholder="12345"
            />
          </div>
        </div>

        {/* Consultation duration */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Duración de consulta (minutos) <span className="text-red-500">*</span>
          </label>
          <select
            value={form.consultation_duration}
            onChange={(e) => set('consultation_duration', Number(e.target.value))}
            className={inputCls}
          >
            {[10, 15, 20, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bio / Presentación</label>
          <textarea
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            rows={2}
            className={`${inputCls} resize-none`}
            placeholder="Breve descripción del doctor..."
          />
        </div>

        {/* Schedule */}
        <ScheduleEditor
          schedule={form.schedule}
          onChange={(s) => set('schedule', s)}
        />

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="submit" size="sm" isLoading={isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear doctor'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 animate-pulse">
      <div className="w-9 h-9 bg-gray-200 rounded-full" />
      <div className="flex-1 space-y-1">
        <div className="h-3.5 bg-gray-200 rounded w-40" />
        <div className="h-3 bg-gray-100 rounded w-28" />
      </div>
      <div className="h-5 bg-gray-100 rounded w-16" />
      <div className="h-5 bg-gray-100 rounded w-8" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DoctorsTab() {
  const { data: doctors = [], isLoading } = useAdminDoctors()
  const toggleActive = useToggleDoctorActive()

  const [formTarget, setFormTarget] = useState<AdminDoctor | null | undefined>(undefined)
  // undefined = form closed; null = new doctor; AdminDoctor = edit

  const [confirmToggle, setConfirmToggle] = useState<AdminDoctor | null>(null)

  function fullName(d: AdminDoctor) {
    return `Dr. ${d.user.first_name} ${d.user.last_name}`
  }

  function activeDays(d: AdminDoctor) {
    return d.schedules
      .filter((s) => s.active)
      .map((s) => DAY_LABELS[s.day_of_week])
      .join(', ')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{doctors.length} doctor{doctors.length !== 1 ? 'es' : ''} registrado{doctors.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setFormTarget(null)}>
          <Plus size={14} className="mr-1.5" />
          Nuevo doctor
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-base overflow-hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <User className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No hay doctores registrados</p>
            <Button size="sm" className="mt-3" onClick={() => setFormTarget(null)}>
              Agregar primer doctor
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {doctors.map((d) => (
              <div key={d.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                  style={{ backgroundColor: d.active ? 'var(--color-primary)' : '#9CA3AF' }}
                >
                  {d.user.first_name[0]}{d.user.last_name[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{fullName(d)}</p>
                    {!d.active && <Badge variant="warning">Inactivo</Badge>}
                    {d.user.must_change_password && (
                      <Badge variant="info">Debe cambiar contraseña</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {d.specialty}{d.cmp ? ` · CMP ${d.cmp}` : ''} · {d.consultation_duration} min
                  </p>
                </div>

                {/* Schedule summary */}
                <div className="hidden md:flex items-center gap-1 text-xs text-gray-400">
                  <Calendar size={12} />
                  <span>{activeDays(d) || 'Sin horario'}</span>
                </div>

                {/* Duration */}
                <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  <span>{d.consultation_duration} min</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFormTarget(d)}
                    className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-gray-100 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmToggle(d)}
                    className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${d.active ? 'text-gray-400 hover:text-red-500' : 'text-gray-400 hover:text-green-600'}`}
                    title={d.active ? 'Desactivar' : 'Activar'}
                  >
                    <Power size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit form */}
      {formTarget !== undefined && (
        <DoctorFormModal
          doctor={formTarget}
          onClose={() => setFormTarget(undefined)}
        />
      )}

      {/* Toggle active confirm */}
      <Modal
        isOpen={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        title={confirmToggle?.active ? 'Desactivar doctor' : 'Activar doctor'}
        size="sm"
      >
        {confirmToggle && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {confirmToggle.active
                ? `¿Desactivar a ${fullName(confirmToggle)}? No aparecerá disponible para nuevas citas.`
                : `¿Activar a ${fullName(confirmToggle)}? Volverá a estar disponible para citas.`
              }
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmToggle(null)}>
                Cancelar
              </Button>
              <Button
                variant={confirmToggle.active ? 'danger' : 'primary'}
                size="sm"
                isLoading={toggleActive.isPending}
                onClick={() => {
                  toggleActive.mutate(
                    { id: confirmToggle.id, active: !confirmToggle.active },
                    { onSuccess: () => setConfirmToggle(null) },
                  )
                }}
              >
                {confirmToggle.active ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
