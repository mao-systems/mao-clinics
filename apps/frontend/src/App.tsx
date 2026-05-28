import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import AdminPage from '@/features/admin/pages/AdminPage'

// Placeholder pages — each module implemented in subsequent steps
function PlaceholderPage({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all routes inside here require authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard"    element={<DashboardPage />} />
          <Route path="/patients"     element={<PlaceholderPage label="Módulo Pacientes — Paso 07" />} />
          <Route path="/appointments" element={<PlaceholderPage label="Módulo Citas — Paso 08" />} />
          <Route path="/records"      element={<PlaceholderPage label="Módulo HCE — Paso 09" />} />
          <Route path="/billing"      element={<PlaceholderPage label="Módulo Facturación — Paso 10" />} />
          <Route path="/admin"        element={<AdminPage />} />
        </Route>
      </Route>

      {/* Root redirects to dashboard (ProtectedRoute handles unauth redirect) */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
