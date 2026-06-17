import { Navigate, Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, LogOut, ShieldCheck } from 'lucide-react'
import { usePlatformAuth } from '@/hooks/usePlatformAuth'
import { Spinner } from '@/components/ui/Spinner'

const BRAND_PRIMARY = '#1A5F9E'
const SIDEBAR_BG = '#1A2740'

export function PlatformProtectedRoute() {
  const { isLoading, isAuthenticated } = usePlatformAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/platform/login" replace />
  }

  return <PlatformLayout />
}

function PlatformLayout() {
  const { admin, logout } = usePlatformAuth()

  const navItems = [
    { to: '/platform/dashboard', label: 'Resumen', icon: LayoutDashboard },
    { to: '/platform/tenants',   label: 'Clientes',  icon: Building2 },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Sidebar */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col"
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        {/* Logo / brand */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-tight">MAO Systems</p>
              <p className="text-white/50 text-xs leading-tight">Plataforma</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                ].join(' ')
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer: admin info + logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-white/80 text-xs font-medium truncate">{admin?.fullName ?? '—'}</p>
          <p className="text-white/40 text-xs truncate mb-3">{admin?.email ?? '—'}</p>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-white/60 hover:text-white text-xs transition-colors"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
