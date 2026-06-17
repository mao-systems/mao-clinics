import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Receipt,
  Settings,
  LogOut,
  Video,
  TestTube2,
  Building2,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { useFeatureFlag, type FeatureFlag } from '@/hooks/useFeatureFlag'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  adminOnly?: boolean
  // When set, the item is hidden if this feature flag is disabled for the tenant
  feature?: FeatureFlag
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Static nav items — feature-gated items are hidden when the flag is off
const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio',        to: '/dashboard',    icon: <LayoutDashboard size={18} />, feature: 'dashboard_kpis' },
  { label: 'Pacientes',     to: '/patients',     icon: <Users size={18} /> },
  { label: 'Citas',         to: '/appointments', icon: <Calendar size={18} /> },
  { label: 'Historial',     to: '/records',      icon: <FileText size={18} />,        feature: 'hce' },
  { label: 'Facturación',   to: '/billing',      icon: <Receipt size={18} />,         feature: 'billing' },
  { label: 'Configuración', to: '/admin',        icon: <Settings size={18} /> },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const { logoUrl, tenantName } = useTenant()

  const hasDashboard     = useFeatureFlag('dashboard_kpis')
  const hasHce           = useFeatureFlag('hce')
  const hasBilling       = useFeatureFlag('billing')
  const hasTelemedicine  = useFeatureFlag('telemedicine')
  const hasLab           = useFeatureFlag('lab_integration')
  const hasMultiLocation = useFeatureFlag('multi_location')
  const hasPremiumFeatures = hasTelemedicine || hasLab || hasMultiLocation

  // Build a lookup so the filter below stays readable
  const flagMap: Partial<Record<FeatureFlag, boolean>> = {
    dashboard_kpis: hasDashboard,
    hce:            hasHce,
    billing:        hasBilling,
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && user?.role !== 'admin') return false
    if (item.feature && !flagMap[item.feature]) return false
    return true
  })

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 rounded-base text-sm font-medium transition-colors px-3 py-2.5',
      isActive
        ? 'bg-white/20 text-white'
        : 'text-white/70 hover:bg-white/10 hover:text-white',
    ].join(' ')

  const logoutBtnClass = [
    'flex w-full items-center gap-3 rounded-base text-sm font-medium px-3 py-2.5',
    'text-white/70 hover:bg-white/10 hover:text-white transition-colors',
  ].join(' ')

  return (
    <>
      {/* Backdrop — covers area to the right of the sidebar on mobile/tablet, hidden on desktop */}
      {isOpen && (
        <div
          className="fixed inset-y-0 left-64 right-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}

      <aside
        data-testid="sidebar"
        className={[
          'flex flex-col h-screen flex-shrink-0 transition-transform duration-300 ease-in-out',
          // Mobile/tablet: fixed overlay (does not occupy flex space)
          'fixed inset-y-0 left-0 z-30 w-64',
          // Desktop (lg+): static in layout, full sidebar with labels
          'lg:static lg:inset-auto lg:z-auto lg:w-56 lg:translate-x-0',
          // Slide animation — overridden on desktop by lg:translate-x-0
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          backgroundColor: 'var(--color-sidebar-bg)',
          color: 'var(--color-sidebar-text)',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-white/10">
          <div className="px-5 py-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              {logoUrl ? (
                <img src={logoUrl} alt={tenantName ?? 'Logo'} className="h-8 w-auto object-contain" />
              ) : (
                <span className="text-lg font-bold tracking-tight text-white">MAO Systems</span>
              )}
              {tenantName && (
                <p className="text-xs mt-1 opacity-60 truncate">{tenantName}</p>
              )}
            </div>
            {/* Close button — hidden on desktop where sidebar is always visible */}
            <button
              onClick={onClose}
              className="lg:hidden text-white/60 hover:text-white p-1 rounded transition-colors"
              aria-label="Cerrar menú"
              data-testid="sidebar-close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={navLinkClass}
              title={item.label}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── Premium modules ──────────────────────────────────────────────── */}
        {hasPremiumFeatures && (
          <div className="pt-2 pb-1 border-t border-white/10">
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider opacity-40">
              Módulos adicionales
            </p>
            <div className="px-2 space-y-0.5">
              {hasTelemedicine && (
                <NavLink to="/telemedicine" onClick={onClose} className={navLinkClass} title="Telemedicina">
                  <span className="flex-shrink-0"><Video size={18} /></span>
                  <span>Telemedicina</span>
                </NavLink>
              )}
              {hasLab && (
                <NavLink to="/lab" onClick={onClose} className={navLinkClass} title="Laboratorio">
                  <span className="flex-shrink-0"><TestTube2 size={18} /></span>
                  <span>Laboratorio</span>
                </NavLink>
              )}
              {hasMultiLocation && (
                <NavLink to="/locations" onClick={onClose} className={navLinkClass} title="Sedes">
                  <span className="flex-shrink-0"><Building2 size={18} /></span>
                  <span>Sedes</span>
                </NavLink>
              )}
            </div>
          </div>
        )}

        {/* ── Logout ──────────────────────────────────────────────────────── */}
        <div className="px-2 pb-4 flex-shrink-0 border-t border-white/10 pt-3">
          <button onClick={logout} className={logoutBtnClass} title="Cerrar sesión">
            <LogOut size={18} className="flex-shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
