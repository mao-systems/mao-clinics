import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Receipt,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Inicio',         to: '/dashboard',    icon: <LayoutDashboard size={18} /> },
  { label: 'Pacientes',      to: '/patients',     icon: <Users size={18} /> },
  { label: 'Citas',          to: '/appointments', icon: <Calendar size={18} /> },
  { label: 'Historial',      to: '/records',      icon: <FileText size={18} /> },
  { label: 'Facturación',    to: '/billing',      icon: <Receipt size={18} /> },
  // Visible to all roles — admins see all tabs; others see only "Mi cuenta"
  { label: 'Configuración',  to: '/admin',        icon: <Settings size={18} /> },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const { logoUrl, tenantName } = useTenant()

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin',
  )

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col h-screen"
      style={{
        backgroundColor: 'var(--color-sidebar-bg)',
        color: 'var(--color-sidebar-text)',
      }}
    >
      {/* Logo + tenant name */}
      <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName ?? 'Logo'} className="h-8 w-auto object-contain" />
        ) : (
          <span className="text-lg font-bold tracking-tight">MAO Systems</span>
        )}
        {tenantName && (
          <p className="text-xs mt-1 opacity-60 truncate">{tenantName}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 rounded-base text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 flex-shrink-0 border-t border-white/10 pt-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-base text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
