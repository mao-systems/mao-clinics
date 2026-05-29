import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface KPICardProps {
  title:      string
  value:      string | number
  subtitle?:  string
  trend?:     { value: number; label: string }
  icon:       LucideIcon
  colorClass?: string
  loading?:   boolean
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  colorClass = 'bg-blue-50',
  loading = false,
}: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-base border border-gray-200 shadow-sm p-5 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-7 bg-gray-200 rounded w-1/2 mt-2" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
        </div>
        <div className="h-5 bg-gray-200 rounded w-1/2" />
      </div>
    )
  }

  const trendPositive = trend && trend.value >= 0
  const trendColor    = trendPositive ? 'text-emerald-600' : 'text-red-500'
  const TrendIcon     = trendPositive ? TrendingUp : TrendingDown

  return (
    <div className="bg-white rounded-base border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
            {title}
          </p>
          <p
            className="text-2xl font-bold mt-1 truncate"
            style={{ color: 'var(--color-primary)' }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ml-3 ${colorClass}`}
        >
          <Icon size={20} style={{ color: 'var(--color-primary)' }} />
        </div>
      </div>

      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendColor}`}>
          <TrendIcon size={13} />
          <span>
            {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}% {trend.label}
          </span>
        </div>
      )}
    </div>
  )
}
