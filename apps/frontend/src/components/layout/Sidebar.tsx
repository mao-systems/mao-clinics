import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Receipt,
  Bell,
  Settings,
} from 'lucide-react'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Pacientes', to: '/patients', icon: <Users size={18} /> },
  { label: 'Citas', to: '/appointments', icon: <CalendarDays size={18} /> },
  { label: 'Historias', to: '/records', icon: <FileText size={18} /> },
  { label: 'Facturación', to: '/billing', icon: <Receipt size={18} /> },
  { label: 'Recordatorios', to: '/reminders', icon: <Bell size={18} /> },
  { label: 'Admin', to: '/admin', icon: <Settings size={18} /> },
]

export function Sidebar() {
  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col h-screen"
      style={{ backgroundColor: 'var(--color-sidebar-bg)', color: 'var(--color-sidebar-text)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <span className="text-lg font-bold tracking-tight">MAO Clinics</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
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
    </aside>
  )
}
