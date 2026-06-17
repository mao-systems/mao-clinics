import { useQuery } from '@tanstack/react-query'
import { Building2, TrendingUp, CheckCircle2, XCircle } from 'lucide-react'
import { platformApi } from '@/lib/platformApi'
import { Spinner } from '@/components/ui/Spinner'

interface DashboardStats {
  totalTenants: number
  activeTenants: number
  inactiveTenants: number
  estimatedMrrSoles: number
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-slate-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-slate-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function PlatformDashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['platform', 'stats'],
    queryFn: () => platformApi.get<DashboardStats>('/tenants/stats'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const mrrFormatted = stats
    ? `S/ ${stats.estimatedMrrSoles.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`
    : '—'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Resumen de plataforma</h1>
        <p className="text-slate-500 mt-1 text-sm">Todos los clientes MAO Systems</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total de clientes"
          value={stats?.totalTenants ?? 0}
          icon={Building2}
          color="bg-blue-500"
        />
        <StatCard
          label="Clientes activos"
          value={stats?.activeTenants ?? 0}
          icon={CheckCircle2}
          color="bg-emerald-500"
        />
        <StatCard
          label="Clientes inactivos"
          value={stats?.inactiveTenants ?? 0}
          icon={XCircle}
          color="bg-slate-400"
        />
        <StatCard
          label="MRR estimado"
          value={mrrFormatted}
          sub="Suma de plan_price_soles de clientes activos"
          icon={TrendingUp}
          color="bg-indigo-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-slate-500 text-sm">
          Gestiona los módulos activos de cada cliente en la sección{' '}
          <strong className="text-slate-700">Clientes</strong>.
        </p>
      </div>
    </div>
  )
}
