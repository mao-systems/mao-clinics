import { useRef, useState } from 'react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import FullCalendar from '@fullcalendar/react'

dayjs.extend(utc)
dayjs.extend(timezone)

const LIMA_TZ = 'America/Lima'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type { EventClickArg, DatesSetArg, EventDropArg, EventContentArg } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { useAuth } from '@/hooks/useAuth'
import {
  useCalendarAppointments,
  useDoctors,
  useUpdateAppointment,
} from '../hooks/useAppointments'
import { appointmentToCalendarEvent } from '../utils/appointments.utils'
import { CalendarHeader } from '../components/CalendarHeader'
import { AppointmentForm } from '../components/AppointmentForm'
import { AppointmentDetailModal } from '../components/AppointmentDetailModal'
import type { AppointmentWithRelations } from '../hooks/useAppointments'

type CalendarView = 'timeGridWeek' | 'timeGridDay' | 'listWeek'

// Default visible range: current week
function getDefaultRange() {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { from: start, to: end }
}

export default function AppointmentsPage() {
  const { user } = useAuth()
  const canCreate = user?.role === 'admin' || user?.role === 'receptionist'

  const calendarRef = useRef<FullCalendar>(null)

  const [currentRange, setCurrentRange]           = useState(getDefaultRange)
  const [currentView, setCurrentView]             = useState<CalendarView>('timeGridWeek')
  const [selectedDoctorId, setSelectedDoctorId]   = useState<string | null>(null)
  const [showForm, setShowForm]                   = useState(false)
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentWithRelations | null>(null)
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithRelations | null>(null)
  const [defaultDate, setDefaultDate]             = useState<Date | null>(null)

  const { data: appointments = [] } = useCalendarAppointments(
    currentRange.from,
    currentRange.to,
    selectedDoctorId ?? undefined,
  )
  const { data: doctors = [] }   = useDoctors()
  const updateAppointment        = useUpdateAppointment()

  const calendarEvents = appointments.map(appointmentToCalendarEvent)

  // ── Handlers ────────────────────────────────────────────────────────────────

  function openNewForm() {
    setDefaultDate(null)
    setEditingAppointment(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingAppointment(null)
    setDefaultDate(null)
  }

  function handleEventClick(info: EventClickArg) {
    const appt = info.event.extendedProps?.appointment as AppointmentWithRelations | undefined
    if (appt) setSelectedAppointment(appt)
  }

  function handleDateClick(info: DateClickArg) {
    if (!canCreate) return
    setDefaultDate(info.date)
    setEditingAppointment(null)
    setShowForm(true)
  }

  function handleDatesSet(info: DatesSetArg) {
    setCurrentRange({ from: info.start, to: info.end })
  }

  function handleEventDrop(info: EventDropArg) {
    if (!info.event.start) { info.revert(); return }
    // FullCalendar with timeZone="America/Lima" and floating event strings
    // returns "ambiguous" Dates in callbacks: their UTC fields encode Lima
    // wall-clock time (e.g. 08:40 Lima is stored as "08:40Z", not "13:40Z").
    // Read those UTC fields as a Lima local string, then convert to real UTC.
    const limaLocal = dayjs.utc(info.event.start).format('YYYY-MM-DDTHH:mm:ss')
    const scheduledAt = dayjs.tz(limaLocal, LIMA_TZ).utc().toISOString()
    updateAppointment.mutate(
      {
        id:   info.event.id,
        data: { scheduled_at: scheduledAt },
      },
      { onError: () => info.revert() },
    )
  }

  function renderEventContent(arg: EventContentArg) {
    const appt = arg.event.extendedProps?.appointment as AppointmentWithRelations | undefined
    const reminderSent = appt?.reminder_sent === true

    return (
      <div style={{ padding: '2px 3px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {arg.timeText && (
          <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.85, lineHeight: 1.2 }}>
            {arg.timeText}
          </span>
        )}
        <span style={{ fontSize: '11px', fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
          {arg.event.title}
        </span>
        {reminderSent && (
          <span style={{
            display:         'inline-flex',
            alignItems:      'center',
            gap:             '2px',
            fontSize:        '9px',
            fontWeight:      700,
            backgroundColor: 'rgba(255,255,255,0.30)',
            borderRadius:    '3px',
            padding:         '1px 4px',
            marginTop:       '1px',
            width:           'fit-content',
            letterSpacing:   '0.03em',
          }}>
            WA ✓
          </span>
        )}
      </div>
    )
  }

  return (
    <div>
      <CalendarHeader
        calendarRef={calendarRef}
        currentRange={currentRange}
        currentView={currentView}
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        onDoctorChange={setSelectedDoctorId}
        onViewChange={setCurrentView}
        onNewAppointment={openNewForm}
        canCreate={canCreate}
      />

      {/* FullCalendar */}
      <div className="bg-white rounded-base border border-gray-200 overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin, listPlugin]}
          initialView="timeGridWeek"
          timeZone="America/Lima"
          locale={esLocale}
          headerToolbar={false}
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          slotDuration="00:15:00"
          slotLabelInterval="01:00:00"
          allDaySlot={false}
          weekends={true}
          nowIndicator={true}
          height="auto"
          contentHeight={620}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5, 6],
            startTime: '08:00',
            endTime: '20:00',
          }}
          editable={canCreate}
          selectable={canCreate}
          events={calendarEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          datesSet={handleDatesSet}
          eventDrop={handleEventDrop}
          eventContent={renderEventContent}
          eventTimeFormat={{
            hour:   '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          slotLabelFormat={{
            hour:   '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
        />
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <AppointmentForm
          appointment={editingAppointment}
          defaultDate={defaultDate}
          onClose={closeForm}
        />
      )}

      {/* Detail modal */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onEdit={() => {
            setEditingAppointment(selectedAppointment)
            setSelectedAppointment(null)
            setShowForm(true)
          }}
        />
      )}
    </div>
  )
}
