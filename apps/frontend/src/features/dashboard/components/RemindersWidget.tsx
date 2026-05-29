import { MessageCircle, Info } from 'lucide-react'

interface RemindersWidgetProps {
  count:     number
  isLoading: boolean
}

export function RemindersWidget({ count, isLoading }: RemindersWidgetProps) {
  return (
    <div className="space-y-4">
      {/* Main stat */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={24} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Recordatorios enviados esta semana
          </p>
          {isLoading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-3xl font-bold text-emerald-600">{count}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">vía WhatsApp (simulado)</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex gap-2.5 bg-blue-50 border border-blue-100 rounded-base p-3">
        <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Los recordatorios se envían automáticamente 24h antes de cada cita.
          En producción se envían por WhatsApp real.
        </p>
      </div>
    </div>
  )
}
