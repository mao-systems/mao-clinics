import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { Badge } from '@/components/ui/Badge'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Médico',
  receptionist: 'Recepcionista',
}

export function Navbar() {
  const { user, logout } = useAuth()
  const { tenantName } = useTenant()

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <span className="text-sm font-medium text-gray-500">{tenantName}</span>

      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm text-gray-700">
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
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
