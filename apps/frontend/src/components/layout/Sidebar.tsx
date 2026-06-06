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
import { useFeatureFlag } from '@/hooks/useFeatureFlag'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Inicio',        to: '/dashboard',    icon: <LayoutDashboard size={18} /> },
  { label: 'Pacientes',     to: '/patients',     icon: <Users size={18} /> },
  { label: 'Citas',         to: '/appointments', icon: <Calendar size={18} /> },
  { label: 'Historial',     to: '/records',      icon: <FileText size={18} /> },
  { label: 'Facturación',   to: '/billing',      icon: <Receipt size={18} /> },
  { label: 'Configuración', to: '/admin',        icon: <Settings size={18} /> },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const { logoUrl, tenantName } = useTenant()

  const hasTelemedicine  = useFeatureFlag('telemedicine')
  const hasLab           = useFeatureFlag('lab_integration')
  const hasMultiLocation = useFeatureFlag('multi_location')
  const hasPremiumFeatures = hasTelemedicine || hasLab || hasMultiLocation

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin',
  )

  // nav link class — centers icon on collapsed tablet, left-aligns on desktop/mobile overlay
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 rounded-base text-sm font-medium transition-colors',
      'px-3 py-2.5',
      'md:justify-center md:px-0 md:py-3',
      'lg:justify-start lg:px-3 lg:py-2.5',
      isActive
        ? 'bg-white/20 text-white'
        : 'text-white/70 hover:bg-white/10 hover:text-white',
    ].join(' ')

  const logoutBtnClass = [
    'flex w-full items-center gap-3 rounded-base text-sm font-medium',
    'text-white/70 hover:bg-white/10 hover:text-white transition-colors',
    'px-3 py-2.5',
    'md:justify-center md:px-0 md:py-3',
    'lg:justify-start lg:px-3 lg:py-2.5',
  ].join(' ')

  return (
    <>
      {/* Mobile backdrop — only on mobile overlay, hidden on tablet+ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}

      <aside
        data-testid="sidebar"
        className={[
          'flex flex-col h-screen flex-shrink-0 transition-transform duration-300 ease-in-out',
          // Mobile: fixed overlay (does not occupy flex space)
          'fixed inset-y-0 left-0 z-30 w-64',
          // Tablet (md–lg): static in layout, collapsed icon-only bar
          'md:static md:inset-auto md:z-auto md:w-16 md:translate-x-0',
          // Desktop (lg+): static in layout, full sidebar with labels
          'lg:w-56',
          // Mobile slide animation — overridden on tablet+ by md:translate-x-0
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          backgroundColor: 'var(--color-sidebar-bg)',
          color: 'var(--color-sidebar-text)',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-white/10">
          {/* Full logo — mobile overlay & desktop */}
          <div className="px-5 py-4 flex items-center justify-between gap-2 md:hidden lg:flex">
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
            {/* Close button — mobile overlay only, hidden on desktop */}
            <button
              onClick={onClose}
              className="lg:hidden text-white/60 hover:text-white p-1 rounded transition-colors"
              aria-label="Cerrar menú"
              data-testid="sidebar-close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Icon-only logo — tablet collapsed */}
          <div className="hidden md:flex lg:hidden justify-center py-4">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 w-8 object-contain rounded" />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                M
              </div>
            )}
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
              {/* Label: shown on mobile overlay and desktop, hidden on tablet collapsed */}
              <span className="md:hidden lg:inline truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── Premium modules ──────────────────────────────────────────────── */}
        {hasPremiumFeatures && (
          <div className="pt-2 pb-1 border-t border-white/10">
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider opacity-40 hidden lg:block">
              Módulos adicionales
            </p>
            <div className="px-2 space-y-0.5">
              {hasTelemedicine && (
                <NavLink to="/telemedicine" onClick={onClose} className={navLinkClass} title="Telemedicina">
                  <span className="flex-shrink-0"><Video size={18} /></span>
                  <span className="md:hidden lg:inline">Telemedicina</span>
                </NavLink>
              )}
              {hasLab && (
                <NavLink to="/lab" onClick={onClose} className={navLinkClass} title="Laboratorio">
                  <span className="flex-shrink-0"><TestTube2 size={18} /></span>
                  <span className="md:hidden lg:inline">Laboratorio</span>
                </NavLink>
              )}
              {hasMultiLocation && (
                <NavLink to="/locations" onClick={onClose} className={navLinkClass} title="Sedes">
                  <span className="flex-shrink-0"><Building2 size={18} /></span>
                  <span className="md:hidden lg:inline">Sedes</span>
                </NavLink>
              )}
            </div>
          </div>
        )}

        {/* ── Logout ──────────────────────────────────────────────────────── */}
        <div className="px-2 pb-4 flex-shrink-0 border-t border-white/10 pt-3">
          <button onClick={logout} className={logoutBtnClass} title="Cerrar sesión">
            <LogOut size={18} className="flex-shrink-0" />
            <span className="md:hidden lg:inline">Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
