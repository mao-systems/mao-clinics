import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DashboardStats {
  appointments_today:       number
  appointments_by_status:   Record<string, number>
  revenue_this_month:       string
  revenue_prev_month:       string
  revenue_change_pct:       number
  new_patients_this_month:  number
  consultations_this_month: number
  attendance_rate:          number
  reminders_this_week:      number
}

export interface ChartAppointmentPoint {
  week:      string
  total:     number
  completed: number
  cancelled: number
}

export interface ChartRevenuePoint {
  week:    string
  revenue: number
}

export interface TodayAppointment {
  id:           string
  scheduled_at: string
  duration_min: number
  status:       string
  reason:       string | null
  reminder_sent: boolean
  patient: {
    first_name: string
    last_name:  string
    dni:        string
    phone:      string | null
  }
  doctor: {
    specialty: string
    user: { first_name: string; last_name: string }
  }
}

export function useDashboardStats() {
  return useQuery({
    queryKey:       ['dashboard', 'stats'],
    queryFn:        () => api.get<DashboardStats>('/dashboard/stats'),
    staleTime:      1000 * 60 * 5,    // 5 min cache
    refetchInterval: 1000 * 60 * 5,   // auto-refresh every 5 min in the background
  })
}

export function useChartAppointments() {
  return useQuery({
    queryKey: ['dashboard', 'chart-appointments'],
    queryFn:  () => api.get<ChartAppointmentPoint[]>('/dashboard/chart-appointments'),
    staleTime: 1000 * 60 * 10,
  })
}

export function useChartRevenue() {
  return useQuery({
    queryKey: ['dashboard', 'chart-revenue'],
    queryFn:  () => api.get<ChartRevenuePoint[]>('/dashboard/chart-revenue'),
    staleTime: 1000 * 60 * 10,
  })
}

export function useTodayAppointments() {
  return useQuery({
    queryKey:       ['dashboard', 'today'],
    queryFn:        () => api.get<TodayAppointment[]>('/dashboard/today'),
    staleTime:      1000 * 60 * 2,   // 2 min — today's list changes often
    refetchInterval: 1000 * 60 * 2,
  })
}
