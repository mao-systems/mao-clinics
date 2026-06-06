import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import { Sidebar }       from '@/components/layout/Sidebar'
import { Navbar }        from '@/components/layout/Navbar'
import { PageContainer } from '@/components/layout/PageContainer'
import { useAuth }       from '@/hooks/useAuth'

// ── Must-change-password banner ───────────────────────────────────────────────
// Shown when the backend marks must_change_password=true on the current user.
// Dismissed in-memory — reappears on next login until the password is changed.

function MustChangePasswordBanner() {
  const [dismissed, setDismissed] = useState(false)
  const { user }                  = useAuth()

  if (!user?.mustChangePassword || dismissed) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
      <div className="flex items-center gap-2 text-sm text-amber-800">
        <AlertTriangle size={15} className="flex-shrink-0 text-amber-500" />
        <span>
          Por seguridad, debes cambiar tu contraseña antes de continuar.{' '}
          <Link
            to="/admin#mi-cuenta"
            className="font-semibold underline hover:text-amber-900"
          >
            Ir a Mi cuenta →
          </Link>
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-500 hover:text-amber-700 flex-shrink-0"
        aria-label="Cerrar aviso"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <MustChangePasswordBanner />

        <PageContainer>
          <Outlet />
        </PageContainer>
      </div>
    </div>
  )
}
