import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ChartRevenuePoint } from '../hooks/useDashboard'

interface RevenueChartProps {
  data:      ChartRevenuePoint[]
  isLoading: boolean
}

function getPrimaryColor(): string {
  if (typeof document === 'undefined') return '#1A5F9E'
  return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1A5F9E'
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value ?? 0
  return (
    <div className="bg-white border border-gray-200 rounded-base shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="font-bold" style={{ color: 'var(--color-primary)' }}>
        S/ {value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
  const primaryColor = getPrimaryColor()

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-52 mb-4" />
        <div className="h-[280px] bg-gray-100 rounded-base" />
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Ingresos por semana (S/)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={primaryColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={primaryColor} stopOpacity={0}   />
            </linearGradient>
          </defs>
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
            width={52}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={primaryColor}
            fill="url(#revenueGradient)"
            fillOpacity={1}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
