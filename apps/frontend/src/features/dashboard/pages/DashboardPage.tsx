import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar,
  TrendingUp,
  UserPlus,
  FileText,
  CheckCircle,
  MessageCircle,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { KPICard } from '../components/KPICard'
import { AppointmentsChart } from '../components/AppointmentsChart'
import { RevenueChart } from '../components/RevenueChart'
import { TodayAppointmentsList } from '../components/TodayAppointmentsList'
import { AppointmentStatusDonut } from '../components/AppointmentStatusDonut'
import { RemindersWidget } from '../components/RemindersWidget'
import {
  useDashboardStats,
  useChartAppointments,
  useChartRevenue,
  useTodayAppointments,
} from '../hooks/useDashboard'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDateEs(date: Date): string {
  const raw = format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function formatLastUpdated(date: Date | null): string {
  if (!date) return ''
  return `Actualizado a las ${format(date, 'HH:mm')}`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const statsQuery        = useDashboardStats()
  const chartApptQuery    = useChartAppointments()
  const chartRevQuery     = useChartRevenue()
  const todayApptQuery    = useTodayAppointments()

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Track last successful stats fetch
  useEffect(() => {
    if (!statsQuery.isFetching && statsQuery.data) {
      setLastUpdated(new Date())
    }
  }, [statsQuery.isFetching, statsQuery.data])

  const stats       = statsQuery.data
  const statsLoading = statsQuery.isLoading

  function handleRefreshAll() {
    void statsQuery.refetch()
    void chartApptQuery.refetch()
    void chartRevQuery.refetch()
    void todayApptQuery.refetch()
  }

  return (
    <div className="space-y-6">
      {/* ── Row 1: Greeting ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            {getGreeting()}, {user?.firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDateEs(new Date())}
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              {formatLastUpdated(lastUpdated)}
            </p>
          )}
        </div>

        <button
          onClick={handleRefreshAll}
          disabled={statsQuery.isFetching}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-base hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={statsQuery.isFetching ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ── Row 2: KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Citas hoy"
          value={stats?.appointments_today ?? 0}
          subtitle={
            stats
              ? `${stats.appointments_by_status['confirmed'] ?? 0} confirmadas · ${stats.appointments_by_status['completed'] ?? 0} completadas`
              : undefined
          }
          icon={Calendar}
          colorClass="bg-blue-50"
          loading={statsLoading}
        />

        <KPICard
          title="Ingresos del mes"
          value={stats?.revenue_this_month ?? 'S/ 0.00'}
          trend={
            stats
              ? { value: stats.revenue_change_pct, label: 'vs mes anterior' }
              : undefined
          }
          icon={TrendingUp}
          colorClass="bg-emerald-50"
          loading={statsLoading}
        />

        <KPICard
          title="Pacientes nuevos"
          value={stats?.new_patients_this_month ?? 0}
          subtitle="Este mes"
          icon={UserPlus}
          colorClass="bg-violet-50"
          loading={statsLoading}
        />

        <KPICard
          title="Consultas completadas"
          value={stats?.consultations_this_month ?? 0}
          subtitle="Este mes"
          icon={FileText}
          colorClass="bg-amber-50"
          loading={statsLoading}
        />

        <KPICard
          title="Tasa de asistencia"
          value={stats ? `${stats.attendance_rate}%` : '0%'}
          subtitle="Últimos 30 días"
          icon={CheckCircle}
          colorClass="bg-teal-50"
          loading={statsLoading}
        />

        <KPICard
          title="Recordatorios enviados"
          value={stats?.reminders_this_week ?? 0}
          subtitle="Esta semana"
          icon={MessageCircle}
          colorClass="bg-green-50"
          loading={statsLoading}
        />
      </div>

      {/* ── Row 3: Bar chart + Status donut ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-base border border-gray-200 shadow-sm p-5">
          <AppointmentsChart
            data={chartApptQuery.data ?? []}
            isLoading={chartApptQuery.isLoading}
          />
        </div>

        <div className="lg:col-span-2 bg-white rounded-base border border-gray-200 shadow-sm p-5">
          {statsLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-5 bg-gray-200 rounded w-40" />
              <div className="h-44 bg-gray-100 rounded-base" />
            </div>
          ) : (
            <AppointmentStatusDonut
              byStatus={stats?.appointments_by_status ?? {}}
            />
          )}
        </div>
      </div>

      {/* ── Row 4: Revenue area chart + Reminders widget ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-base border border-gray-200 shadow-sm p-5">
          <RevenueChart
            data={chartRevQuery.data ?? []}
            isLoading={chartRevQuery.isLoading}
          />
        </div>

        <div className="lg:col-span-2 bg-white rounded-base border border-gray-200 shadow-sm p-5">
          <RemindersWidget
            count={stats?.reminders_this_week ?? 0}
            isLoading={statsLoading}
          />
        </div>
      </div>

      {/* ── Row 5: Today's appointments full width ────────────────────── */}
      <TodayAppointmentsList
        appointments={todayApptQuery.data ?? []}
        isLoading={todayApptQuery.isLoading}
        onRefresh={() => void todayApptQuery.refetch()}
      />
    </div>
  )
}
