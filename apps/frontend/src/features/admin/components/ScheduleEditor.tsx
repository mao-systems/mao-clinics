import type { DaySchedule } from '../hooks/useAdminDoctors'

// ── Constants ─────────────────────────────────────────────────────────────────

export const DAY_NAMES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
]

const DAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

type PresetId = 'lv' | 'ls' | 'custom'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  value:    DaySchedule[]
  onChange: (schedule: DaySchedule[]) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEntry(schedule: DaySchedule[], day: number): DaySchedule | undefined {
  return schedule.find(s => s.day_of_week === day)
}

function buildDefault(days: number[], start: string, end: string): DaySchedule[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    start_time:  days.includes(i) ? start : '08:00',
    end_time:    days.includes(i) ? end   : '18:00',
    active:      days.includes(i),
  }))
}

function detectPreset(schedule: DaySchedule[]): PresetId {
  const active = schedule.filter(s => s.active).map(s => s.day_of_week).sort()

  const isLV = active.length === 5 && active.every((d, i) => d === i + 1)
    && schedule.filter(s => s.active).every(s => s.start_time === '08:00' && s.end_time === '18:00')
  if (isLV) return 'lv'

  const isLS = active.length === 6 && active.every((d, i) => d === i + 1)
    && schedule.filter(s => s.active).every(s => s.start_time === '08:00' && s.end_time === '14:00')
  if (isLS) return 'ls'

  return 'custom'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScheduleEditor({ value, onChange }: Props) {
  const currentPreset = detectPreset(value)

  function toggleDay(day: number) {
    const existing = getEntry(value, day)
    if (existing) {
      onChange(value.map(s => s.day_of_week === day ? { ...s, active: !s.active } : s))
    } else {
      onChange([
        ...value,
        { day_of_week: day, start_time: '08:00', end_time: '18:00', active: true },
      ])
    }
  }

  function updateTime(day: number, field: 'start_time' | 'end_time', val: string) {
    onChange(value.map(s => s.day_of_week === day ? { ...s, [field]: val } : s))
  }

  function applyPreset(preset: PresetId) {
    if (preset === 'lv')     onChange(buildDefault([1,2,3,4,5], '08:00', '18:00'))
    else if (preset === 'ls') onChange(buildDefault([1,2,3,4,5,6], '08:00', '14:00'))
    // 'custom' does nothing — just lets the user edit freely
  }

  // Ensure all 7 days are represented (fill gaps from backend)
  const fullSchedule = Array.from({ length: 7 }, (_, i) =>
    getEntry(value, i) ?? { day_of_week: i, start_time: '08:00', end_time: '18:00', active: false }
  )

  const timeInputCls = 'px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 bg-white'

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-3">Horario de atención</label>

      {/* Presets */}
      <div className="flex gap-2 mb-4">
        {([
          { id: 'lv',     label: 'Lun–Vie 8:00–18:00' },
          { id: 'ls',     label: 'Lun–Sáb 8:00–14:00' },
          { id: 'custom', label: 'Personalizado' },
        ] as { id: PresetId; label: string }[]).map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className={[
              'px-3 py-1 text-xs rounded-full border transition-colors',
              currentPreset === p.id
                ? 'border-primary text-primary bg-primary/5 font-medium'
                : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700',
            ].join(' ')}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Day rows */}
      <div className="space-y-2">
        {fullSchedule.map(entry => {
          const { day_of_week: day, active, start_time, end_time } = entry

          // Check if end_time is after start_time
          const invalid = active && start_time >= end_time

          return (
            <div key={day} className={`flex items-center gap-3 py-1 ${!active ? 'opacity-50' : ''}`}>
              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className={[
                  'relative w-9 h-5 rounded-full transition-colors flex-shrink-0 focus:outline-none',
                  active ? 'bg-primary' : 'bg-gray-300',
                ].join(' ')}
                style={active ? { backgroundColor: 'var(--color-primary)' } : {}}
                aria-label={`${active ? 'Desactivar' : 'Activar'} ${DAY_NAMES[day]}`}
              >
                <span
                  className={[
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    active ? 'translate-x-4' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>

              {/* Day name */}
              <span className="w-20 text-sm text-gray-700">{DAY_NAMES[day]}</span>

              {/* Time inputs */}
              {active ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    step="900"
                    value={start_time}
                    onChange={e => updateTime(day, 'start_time', e.target.value)}
                    className={`${timeInputCls} ${invalid ? 'border-red-400' : ''}`}
                    style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                  />
                  <span className="text-gray-400 text-xs">–</span>
                  <input
                    type="time"
                    step="900"
                    value={end_time}
                    onChange={e => updateTime(day, 'end_time', e.target.value)}
                    className={`${timeInputCls} ${invalid ? 'border-red-400' : ''}`}
                    style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                  />
                  {invalid && (
                    <span className="text-xs text-red-500">Hora fin debe ser mayor</span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-gray-400 italic">No disponible</span>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        El horario define cuándo están disponibles los slots para agendar citas.
      </p>
    </div>
  )
}

// Re-export helper for other components that show day pills
export { DAY_SHORT }
