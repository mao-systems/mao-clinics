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
import BillingPage from '@/features/billing/pages/BillingPage'

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
          <Route path="/billing"      element={<BillingPage />} />
          <Route path="/admin"        element={<AdminPage />} />
        </Route>
      </Route>

      {/* Root redirects to dashboard (ProtectedRoute handles unauth redirect) */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
