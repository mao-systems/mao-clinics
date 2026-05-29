import Decimal from 'decimal.js'
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz'
import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const LIMA_TZ   = 'America/Lima'
const DAY_MS    = 24 * 60 * 60 * 1000
const WEEK_MS   = 7 * DAY_MS

// Spanish month abbreviations for chart labels
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Format Decimal as "S/ 4,820.00"
function formatRevenue(value: Decimal | null | undefined): string {
  const num = new Decimal(value?.toString() ?? '0')
  const fixed = num.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `S/ ${withCommas}.${decPart}`
}

// Compute all Lima-timezone date boundaries needed for dashboard queries.
// All returned Dates are UTC instants corresponding to Lima local midnight/end-of-day.
function computeDateBounds(now: Date) {
  const limaDateStr = formatInTimeZone(now, LIMA_TZ, 'yyyy-MM-dd')
  const [y, m, d]   = limaDateStr.split('-').map(Number) as [number, number, number]

  const todayStart = fromZonedTime(`${y}-${pad(m)}-${pad(d)}T00:00:00`, LIMA_TZ)
  const todayEnd   = fromZonedTime(`${y}-${pad(m)}-${pad(d)}T23:59:59.999`, LIMA_TZ)

  // This month boundaries in Lima
  const lastDayThisMonth = new Date(y, m, 0).getDate() // JS month is 0-indexed: new Date(y,m,0) = last day of month m
  const monthStart       = fromZonedTime(`${y}-${pad(m)}-01T00:00:00`, LIMA_TZ)
  const monthEnd         = fromZonedTime(`${y}-${pad(m)}-${pad(lastDayThisMonth)}T23:59:59.999`, LIMA_TZ)

  // Previous month boundaries in Lima
  const prevM            = m === 1 ? 12 : m - 1
  const prevY            = m === 1 ? y - 1 : y
  const lastDayPrevMonth = new Date(prevY, prevM, 0).getDate()
  const prevMonthStart   = fromZonedTime(`${prevY}-${pad(prevM)}-01T00:00:00`, LIMA_TZ)
  const prevMonthEnd     = fromZonedTime(`${prevY}-${pad(prevM)}-${pad(lastDayPrevMonth)}T23:59:59.999`, LIMA_TZ)

  // Last 30 days
  const last30Start = new Date(todayStart.getTime() - 30 * DAY_MS)

  // Current week start (ISO Monday) in Lima — derive from Lima date string to avoid TZ issues
  const limaDate   = new Date(y, m - 1, d)  // local JS date matching Lima calendar date
  const jsWeekday  = limaDate.getDay()       // 0=Sun, 1=Mon ... 6=Sat
  const isoWeekday = jsWeekday === 0 ? 7 : jsWeekday  // 1=Mon ... 7=Sun
  const weekStart  = new Date(todayStart.getTime() - (isoWeekday - 1) * DAY_MS)

  return { y, m, d, todayStart, todayEnd, monthStart, monthEnd, prevMonthStart, prevMonthEnd, last30Start, weekStart }
}

// Generate the 8 week date ranges used by both chart methods (oldest → newest)
function buildWeekRanges(now: Date): Array<{ weekStart: Date; weekEnd: Date }> {
  const { todayStart } = computeDateBounds(now)

  // Monday of the current Lima week
  const limaDateStr = formatInTimeZone(now, LIMA_TZ, 'yyyy-MM-dd')
  const [y, m, d]   = limaDateStr.split('-').map(Number) as [number, number, number]
  const limaDate    = new Date(y, m - 1, d)
  const jsWeekday   = limaDate.getDay()
  const isoWeekday  = jsWeekday === 0 ? 7 : jsWeekday
  const currentWeekMonday = new Date(todayStart.getTime() - (isoWeekday - 1) * DAY_MS)

  return Array.from({ length: 8 }, (_, i) => {
    const weeksAgo  = 7 - i   // i=0 → 7 weeks ago (oldest), i=7 → current week
    const weekStart = new Date(currentWeekMonday.getTime() - weeksAgo * WEEK_MS)
    const weekEnd   = new Date(weekStart.getTime() + WEEK_MS - 1)
    return { weekStart, weekEnd }
  })
}

function weekLabel(weekStart: Date, weekEnd: Date): string {
  const startDay  = parseInt(formatInTimeZone(weekStart, LIMA_TZ, 'd'), 10)
  const endDay    = parseInt(formatInTimeZone(weekEnd,   LIMA_TZ, 'd'), 10)
  const monthIdx  = parseInt(formatInTimeZone(weekStart, LIMA_TZ, 'M'), 10) - 1
  const monthName = MONTHS_ES[monthIdx] ?? ''
  return `${startDay}-${endDay} ${monthName}`
}

export class DashboardService {
  constructor(private readonly db: PrismaClient) {}

  // ── getStats ──────────────────────────────────────────────────────────────────
  // All 8 queries run in parallel via Promise.all — never sequential.

  async getStats(tenantId: string) {
    const now = new Date()
    const { todayStart, todayEnd, monthStart, monthEnd, prevMonthStart, prevMonthEnd, last30Start, weekStart } =
      computeDateBounds(now)

    const [
      appointmentsToday,
      appointmentsByStatusRaw,
      revThisMonthAgg,
      revPrevMonthAgg,
      newPatientsCount,
      consultationsCount,
      attendanceCounts,
      remindersCount,
    ] = await Promise.all([
      // [1] Total appointments today
      this.db.appointment.count({
        where: {
          tenant_id:   tenantId,
          scheduled_at: { gte: todayStart, lte: todayEnd },
          deleted_at:  null,
        },
      }),

      // [2] Appointments by status today
      this.db.appointment.groupBy({
        by:    ['status'],
        where: {
          tenant_id:    tenantId,
          scheduled_at: { gte: todayStart, lte: todayEnd },
          deleted_at:   null,
        },
        _count: { id: true },
      }),

      // [3] Revenue this month (exclude cancelled invoices)
      this.db.invoice.aggregate({
        where: {
          tenant_id:   tenantId,
          issued_at:   { gte: monthStart, lte: monthEnd },
          sunat_status: { not: 'cancelled' },
        },
        _sum: { total: true },
      }),

      // [4] Revenue previous month
      this.db.invoice.aggregate({
        where: {
          tenant_id:   tenantId,
          issued_at:   { gte: prevMonthStart, lte: prevMonthEnd },
          sunat_status: { not: 'cancelled' },
        },
        _sum: { total: true },
      }),

      // [5] New patients this month
      this.db.patient.count({
        where: {
          tenant_id:  tenantId,
          created_at: { gte: monthStart, lte: monthEnd },
          deleted_at: null,
        },
      }),

      // [6] Consultations this month
      this.db.consultation.count({
        where: {
          tenant_id:  tenantId,
          created_at: { gte: monthStart, lte: monthEnd },
        },
      }),

      // [7] Attendance rate (last 30 days) — two sub-queries nested in one Promise.all slot
      Promise.all([
        this.db.appointment.count({
          where: {
            tenant_id:    tenantId,
            scheduled_at: { gte: last30Start, lte: todayEnd },
            status:       { notIn: ['pending', 'cancelled'] },
            deleted_at:   null,
          },
        }),
        this.db.appointment.count({
          where: {
            tenant_id:    tenantId,
            scheduled_at: { gte: last30Start, lte: todayEnd },
            status:       'completed',
            deleted_at:   null,
          },
        }),
      ]),

      // [8] Reminders sent this week
      this.db.reminder.count({
        where: {
          tenant_id: tenantId,
          sent_at:   { gte: weekStart },
          status:    { in: ['sent', 'mock'] },
        },
      }),
    ])

    // Build appointments_by_status map
    const appointmentsByStatus: Record<string, number> = {}
    for (const row of appointmentsByStatusRaw) {
      appointmentsByStatus[row.status] = row._count.id
    }

    // Revenue calculations using Decimal to avoid float drift
    const thisMonthRev = new Decimal(revThisMonthAgg._sum.total?.toString() ?? '0')
    const prevMonthRev = new Decimal(revPrevMonthAgg._sum.total?.toString() ?? '0')
    const revenueChangePct = prevMonthRev.isZero()
      ? 0
      : thisMonthRev.minus(prevMonthRev).dividedBy(prevMonthRev).times(100).toDecimalPlaces(1).toNumber()

    // Attendance rate
    const [totalNonPending, completedCount] = attendanceCounts
    const attendanceRate = totalNonPending > 0
      ? Math.round((completedCount / totalNonPending) * 100)
      : 0

    return {
      appointments_today:        appointmentsToday,
      appointments_by_status:    appointmentsByStatus,
      revenue_this_month:        formatRevenue(thisMonthRev),
      revenue_prev_month:        formatRevenue(prevMonthRev),
      revenue_change_pct:        revenueChangePct,
      new_patients_this_month:   newPatientsCount,
      consultations_this_month:  consultationsCount,
      attendance_rate:           attendanceRate,
      reminders_this_week:       remindersCount,
    }
  }

  // ── getChartAppointments ──────────────────────────────────────────────────────
  // Last 8 weeks, each as { week, total, completed, cancelled }.

  async getChartAppointments(tenantId: string) {
    const now   = new Date()
    const weeks = buildWeekRanges(now)

    const results = await Promise.all(
      weeks.map(async ({ weekStart, weekEnd }) => {
        const baseWhere = {
          tenant_id:    tenantId,
          scheduled_at: { gte: weekStart, lte: weekEnd },
          deleted_at:   null,
        }

        const [total, completed, cancelled] = await Promise.all([
          this.db.appointment.count({ where: baseWhere }),
          this.db.appointment.count({ where: { ...baseWhere, status: 'completed' } }),
          this.db.appointment.count({ where: { ...baseWhere, status: 'cancelled' } }),
        ])

        return {
          week:      weekLabel(weekStart, weekEnd),
          total,
          completed,
          cancelled,
        }
      }),
    )

    return results
  }

  // ── getChartRevenue ───────────────────────────────────────────────────────────
  // Last 8 weeks, each as { week, revenue } where revenue is a plain number for Recharts.

  async getChartRevenue(tenantId: string) {
    const now   = new Date()
    const weeks = buildWeekRanges(now)

    const results = await Promise.all(
      weeks.map(async ({ weekStart, weekEnd }) => {
        const agg = await this.db.invoice.aggregate({
          where: {
            tenant_id:    tenantId,
            issued_at:    { gte: weekStart, lte: weekEnd },
            sunat_status: { not: 'cancelled' },
          },
          _sum: { total: true },
        })

        const revenue = new Decimal(agg._sum.total?.toString() ?? '0').toDecimalPlaces(2).toNumber()

        return {
          week: weekLabel(weekStart, weekEnd),
          revenue,
        }
      }),
    )

    return results
  }

  // ── getTodayAppointments ──────────────────────────────────────────────────────
  // Appointments for today in Lima TZ, ordered by time, max 20.

  async getTodayAppointments(tenantId: string) {
    const now = new Date()
    const { todayStart, todayEnd } = computeDateBounds(now)

    return this.db.appointment.findMany({
      where: {
        tenant_id:    tenantId,
        scheduled_at: { gte: todayStart, lte: todayEnd },
        deleted_at:   null,
      },
      include: {
        patient: { select: { first_name: true, last_name: true, dni: true, phone: true } },
        doctor: {
          select: {
            specialty: true,
            user: { select: { first_name: true, last_name: true } },
          },
        },
      },
      orderBy: { scheduled_at: 'asc' },
      take:    20,
    })
  }
}

export const dashboardService = new DashboardService(prisma)
