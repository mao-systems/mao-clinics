import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type FullCalendar from '@fullcalendar/react'
import { Button } from '@/components/ui/Button'
import { formatWeekRange } from '../utils/appointments.utils'
import type { DoctorSummary } from '../hooks/useAppointments'

type CalendarView = 'timeGridWeek' | 'timeGridDay' | 'listWeek'

interface CalendarHeaderProps {
  calendarRef:       React.RefObject<FullCalendar>
  currentRange:      { from: Date; to: Date }
  currentView:       CalendarView
  doctors:           DoctorSummary[]
  selectedDoctorId:  string | null
  onDoctorChange:    (id: string | null) => void
  onViewChange:      (view: CalendarView) => void
  onNewAppointment:  () => void
  canCreate:         boolean
}

const VIEW_LABELS: Record<CalendarView, string> = {
  timeGridWeek: 'Semana',
  timeGridDay:  'Día',
  listWeek:     'Lista',
}

export function CalendarHeader({
  calendarRef,
  currentRange,
  currentView,
  doctors,
  selectedDoctorId,
  onDoctorChange,
  onViewChange,
  onNewAppointment,
  canCreate,
}: CalendarHeaderProps) {
  const api = () => calendarRef.current?.getApi()

  function prev()  { api()?.prev();  }
  function next()  { api()?.next();  }
  function today() { api()?.today(); }

  function changeView(view: CalendarView) {
    api()?.changeView(view)
    onViewChange(view)
  }

  const rangeLabel =
    currentRange.from && currentRange.to
      ? formatWeekRange(currentRange.from, currentRange.to)
      : '...'

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 mb-4 bg-white rounded-base border border-gray-200 px-4 py-3">
      {/* Left: navigation + range label */}
      <div className="flex items-center gap-2">
        <button
          onClick={prev}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={today}
          className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-base hover:bg-gray-50 transition-colors text-gray-700"
        >
          Hoy
        </button>
        <button
          onClick={next}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="Semana siguiente"
        >
          <ChevronRight size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-800 ml-2 capitalize">
          {rangeLabel}
        </span>
      </div>

      {/* Right: doctor filter + view toggle + new button */}
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        {/* Doctor filter — full width on mobile */}
        <select
          value={selectedDoctorId ?? ''}
          onChange={(e) => onDoctorChange(e.target.value || null)}
          className="flex-1 sm:flex-initial py-1.5 pl-3 pr-8 text-sm border border-gray-200 rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
        >
          <option value="">Todos los médicos</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              Dr. {d.user.last_name} · {d.specialty}
            </option>
          ))}
        </select>

        {/* View toggle */}
        <div className="flex rounded-base border border-gray-200 overflow-hidden">
          {(Object.keys(VIEW_LABELS) as CalendarView[]).map((view) => (
            <button
              key={view}
              onClick={() => changeView(view)}
              className={[
                'px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors',
                currentView === view
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>

        {/* New appointment button */}
        {canCreate && (
          <Button size="sm" onClick={onNewAppointment}>
            <Plus size={14} className="mr-1.5" />
            <span className="hidden xs:inline sm:inline">Nueva </span>cita
          </Button>
        )}
      </div>
    </div>
  )
}
