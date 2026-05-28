import { useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type { EventClickArg, DatesSetArg, EventDropArg } from '@fullcalendar/core'
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
    updateAppointment.mutate(
      {
        id:   info.event.id,
        data: { scheduled_at: info.event.start.toISOString() },
      },
      { onError: () => info.revert() },
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
