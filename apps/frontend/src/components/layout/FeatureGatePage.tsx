import { Lock } from 'lucide-react'
import type { FeatureFlag } from '@/hooks/useFeatureFlag'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'

interface FeatureGatePageProps {
  flag: FeatureFlag
  moduleName: string
  children: React.ReactNode
}

/**
 * Wraps a page route and shows a "not in your plan" wall when the feature flag
 * is disabled for this tenant. Activated by the SuperAdmin toggle panel.
 */
export function FeatureGatePage({ flag, moduleName, children }: FeatureGatePageProps) {
  const hasFeature = useFeatureFlag(flag)

  if (!hasFeature) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Lock size={24} className="text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Módulo no disponible
        </h2>
        <p className="text-sm text-gray-500 max-w-sm">
          <span className="font-medium text-gray-700">{moduleName}</span> no está incluido
          en el plan actual de tu clínica. Contacta a MAO Systems para activarlo.
        </p>
        <p className="mt-4 text-xs text-gray-400">maosystems.io</p>
      </div>
    )
  }

  return <>{children}</>
}
