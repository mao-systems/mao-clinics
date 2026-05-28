import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import AdminPage from '@/features/admin/pages/AdminPage'
import PatientsPage from '@/features/patients/pages/PatientsPage'
import PatientDetailPage from '@/features/patients/pages/PatientDetailPage'
import AppointmentsPage from '@/features/appointments/pages/AppointmentsPage'
import ConsultationPage from '@/features/records/pages/ConsultationPage'
import RecordsPage from '@/features/records/pages/RecordsPage'

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
          <Route path="/patients"     element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/appointments/:appointmentId/consultation" element={<ConsultationPage />} />
          <Route path="/records"      element={<RecordsPage />} />
          <Route path="/billing"      element={<PlaceholderPage label="Módulo Facturación — Paso 10" />} />
          <Route path="/admin"        element={<AdminPage />} />
        </Route>
      </Route>

      {/* Root redirects to dashboard (ProtectedRoute handles unauth redirect) */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
