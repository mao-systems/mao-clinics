import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  STATUS_COLORS,
  type AppointmentStatus,
} from '@/features/appointments/constants/appointments.constants'

interface AppointmentStatusDonutProps {
  byStatus: Record<string, number>
}

const STATUS_ORDER: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]

function CustomTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number }>
}) {
  if (!active || !payload?.length) return null
  const entry = payload[0]!
  return (
    <div className="bg-white border border-gray-200 rounded-base shadow-lg px-3 py-2 text-sm">
      <span className="text-gray-700">{entry.name}: </span>
      <span className="font-semibold">{entry.value} citas</span>
    </div>
  )
}

export function AppointmentStatusDonut({ byStatus }: AppointmentStatusDonutProps) {
  const chartData = STATUS_ORDER
    .map((status) => ({
      name:  STATUS_COLORS[status].label,
      value: byStatus[status] ?? 0,
      color: STATUS_COLORS[status].bg,
      status,
    }))
    .filter((d) => d.value > 0)

  const total = STATUS_ORDER.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0)
  const isEmpty = total === 0

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Estado de citas hoy</h3>

      <div className="flex items-center gap-4">
        {/* Donut chart with center text overlay */}
        <div className="relative flex-shrink-0" style={{ width: 180, height: 180 }}>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {isEmpty ? (
              <span className="text-xs text-gray-400">Sin datos</span>
            ) : (
              <>
                <span
                  className="text-2xl font-bold leading-none"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {total}
                </span>
                <span className="text-xs text-gray-500 mt-0.5">citas hoy</span>
              </>
            )}
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={isEmpty ? [{ name: 'Sin datos', value: 1 }] : chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                strokeWidth={2}
                stroke="#FFFFFF"
              >
                {isEmpty ? (
                  <Cell fill="#E5E7EB" />
                ) : (
                  chartData.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))
                )}
              </Pie>
              {!isEmpty && <Tooltip content={<CustomTooltip />} />}
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {STATUS_ORDER.map((status) => {
            const count = byStatus[status] ?? 0
            const colors = STATUS_COLORS[status]
            return (
              <div key={status} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  />
                  <span className="text-gray-600 truncate">{colors.label}</span>
                </div>
                <span className="font-semibold text-gray-800 flex-shrink-0">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
