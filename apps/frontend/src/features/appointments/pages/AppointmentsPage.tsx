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

// On small screens the week grid is too dense — default to list view
function getDefaultView(): CalendarView {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 'listWeek'
  return 'timeGridWeek'
}

export default function AppointmentsPage() {
  const { user } = useAuth()
  const canCreate = user?.role === 'admin' || user?.role === 'receptionist'

  const calendarRef = useRef<FullCalendar>(null)

  const [currentRange, setCurrentRange]           = useState(getDefaultRange)
  const [currentView, setCurrentView]             = useState<CalendarView>(getDefaultView)
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
            gap:             '3px',
            fontSize:        '9px',
            fontWeight:      700,
            backgroundColor: '#128c7e',
            borderRadius:    '3px',
            padding:         '1px 4px',
            marginTop:       '1px',
            width:           'fit-content',
            color:           '#fff',
          }}>
            {/* WhatsApp logo */}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {/* Double blue tick = "leído", mimics WhatsApp read receipts */}
            <span style={{ color: '#a8eddf', letterSpacing: '-1px' }}>✓✓</span>
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
          initialView={getDefaultView()}
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
