import { TrendingUp, FileText, Receipt, Building2 } from 'lucide-react'
import type { BillingSummary } from '../hooks/useBilling'
import { formatCurrency } from '../utils/billing.utils'

interface BillingSummaryCardsProps {
  summary: BillingSummary
  period:  string
}

interface KpiCardProps {
  label:     string
  value:     string
  icon:      React.ReactNode
  iconBg:    string
  primary?:  boolean
}

function KpiCard({ label, value, icon, iconBg, primary }: KpiCardProps) {
  return (
    <div
      className={[
        'rounded-base border p-4 flex items-center gap-4',
        primary
          ? 'bg-primary border-primary text-white'
          : 'bg-white border-gray-200',
      ].join(' ')}
    >
      <div
        className="w-10 h-10 rounded-base flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-medium truncate ${primary ? 'text-white/80' : 'text-gray-500'}`}>
          {label}
        </p>
        <p className={`text-xl font-bold truncate ${primary ? 'text-white' : 'text-gray-800'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

export function BillingSummaryCards({ summary, period }: BillingSummaryCardsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Ingresos del período"
          value={formatCurrency(summary.total_amount)}
          icon={<TrendingUp size={20} className="text-white" />}
          iconBg="rgba(255,255,255,0.25)"
          primary
        />
        <KpiCard
          label="Comprobantes emitidos"
          value={String(summary.total_invoices)}
          icon={<FileText size={20} style={{ color: 'var(--color-primary)' }} />}
          iconBg="var(--color-primary-light)"
        />
        <KpiCard
          label="Boletas"
          value={String(summary.total_boletas)}
          icon={<Receipt size={20} className="text-emerald-600" />}
          iconBg="#D1FAE5"
        />
        <KpiCard
          label="Facturas"
          value={String(summary.total_facturas)}
          icon={<Building2 size={20} className="text-violet-600" />}
          iconBg="#EDE9FE"
        />
      </div>

      <p className="text-xs text-gray-400 text-right">
        IGV generado: <span className="font-medium text-gray-600">{formatCurrency(summary.total_tax)}</span>
        {period && <span className="ml-2">· {period}</span>}
      </p>
    </div>
  )
}
