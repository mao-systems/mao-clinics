import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ThemeEditor } from '../components/ThemeEditor'

type TabId = 'appearance' | 'users' | 'clinic'

interface Tab {
  id: TabId
  label: string
}

const TABS: Tab[] = [
  { id: 'appearance', label: 'Apariencia' },
  { id: 'users', label: 'Usuarios' },
  { id: 'clinic', label: 'Mi clínica' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('appearance')

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Personaliza la apariencia y ajustes de tu clínica"
      />

      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-5 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'appearance' && <ThemeEditor />}

      {activeTab === 'users' && (
        <div className="flex items-center justify-center h-40">
          <p className="text-sm text-gray-400">Gestión de usuarios — próximamente</p>
        </div>
      )}

      {activeTab === 'clinic' && (
        <div className="flex items-center justify-center h-40">
          <p className="text-sm text-gray-400">Datos de la clínica — próximamente</p>
        </div>
      )}
    </div>
  )
}
