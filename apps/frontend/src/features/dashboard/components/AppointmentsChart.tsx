import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartAppointmentPoint } from '../hooks/useDashboard'

interface AppointmentsChartProps {
  data:      ChartAppointmentPoint[]
  isLoading: boolean
}

function getPrimaryColor(): string {
  if (typeof document === 'undefined') return '#1A5F9E'
  return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1A5F9E'
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-base shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-800">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function AppointmentsChart({ data, isLoading }: AppointmentsChartProps) {
  const primaryColor = getPrimaryColor()

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-[280px] bg-gray-100 rounded-base" />
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Citas por semana</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={4} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            allowDecimals={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(value) => (
              <span style={{ color: '#6B7280' }}>{value}</span>
            )}
          />
          <Bar dataKey="total"     name="Total citas"  fill={primaryColor} radius={[3, 3, 0, 0]} />
          <Bar dataKey="completed" name="Completadas"  fill="#10B981"      radius={[3, 3, 0, 0]} />
          <Bar dataKey="cancelled" name="Canceladas"   fill="#EF4444"      radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
