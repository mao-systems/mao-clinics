import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/Badge'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  doctor: 'Médico',
  receptionist: 'Recepcionista',
}

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.firstName}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          {user?.role && (
            <Badge variant="info">{roleLabels[user.role] ?? user.role}</Badge>
          )}
          {user?.tenant?.name && (
            <span className="text-sm text-gray-500">{user.tenant.name}</span>
          )}
        </div>
      </div>

      <div className="rounded-base border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-gray-400 text-sm">
          Dashboard completo disponible en el Paso 07
        </p>
      </div>
    </div>
  )
}
