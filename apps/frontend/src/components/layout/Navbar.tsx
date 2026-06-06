import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { Badge } from '@/components/ui/Badge'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Médico',
  receptionist: 'Recepcionista',
}

interface NavbarProps {
  onMenuClick: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth()
  const { tenantName } = useTenant()

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — visible only on mobile (tablet+ shows collapsed sidebar permanently) */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          aria-label="Abrir menú de navegación"
          data-testid="menu-button"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-medium text-gray-500 truncate">{tenantName}</span>
      </div>

      <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
        {user && (
          <>
            <span className="hidden sm:block text-sm text-gray-700 truncate max-w-[160px]">
              {user.firstName} {user.lastName}
            </span>
            <Badge variant="info">
              {roleLabels[user.role] ?? user.role}
            </Badge>
          </>
        )}
        <button
          onClick={logout}
          title="Cerrar sesión"
          className="p-1.5 text-gray-500 hover:text-red-600 transition-colors rounded"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
