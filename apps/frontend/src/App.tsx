import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { PlatformProtectedRoute } from '@/pages/platform/PlatformLayout'
import { FeatureGatePage } from '@/components/layout/FeatureGatePage'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import AdminPage from '@/features/admin/pages/AdminPage'
import PatientsPage from '@/features/patients/pages/PatientsPage'
import PatientDetailPage from '@/features/patients/pages/PatientDetailPage'
import AppointmentsPage from '@/features/appointments/pages/AppointmentsPage'
import ConsultationPage from '@/features/records/pages/ConsultationPage'
import RecordsPage from '@/features/records/pages/RecordsPage'
import BillingPage from '@/features/billing/pages/BillingPage'
import PlatformLoginPage from '@/pages/platform/PlatformLoginPage'
import PlatformDashboardPage from '@/pages/platform/PlatformDashboardPage'
import PlatformTenantsPage from '@/pages/platform/PlatformTenantsPage'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all routes inside here require authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard"    element={<FeatureGatePage flag="dashboard_kpis" moduleName="Dashboard KPIs"><DashboardPage /></FeatureGatePage>} />
          <Route path="/patients"     element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/appointments/:appointmentId/consultation" element={<FeatureGatePage flag="hce" moduleName="Historia Clínica Electrónica"><ConsultationPage /></FeatureGatePage>} />
          <Route path="/records"      element={<FeatureGatePage flag="hce" moduleName="Historia Clínica Electrónica"><RecordsPage /></FeatureGatePage>} />
          <Route path="/billing"      element={<FeatureGatePage flag="billing" moduleName="Facturación"><BillingPage /></FeatureGatePage>} />
          <Route path="/admin"        element={<AdminPage />} />
        </Route>
      </Route>

      {/* ── Platform SuperAdmin panel — completely separate from tenant routes ── */}
      {/* Public platform login — its own cookie / auth context */}
      <Route path="/platform/login" element={<PlatformLoginPage />} />

      {/* Protected platform routes — require platformAccessToken cookie */}
      <Route element={<PlatformProtectedRoute />}>
        <Route path="/platform/dashboard" element={<PlatformDashboardPage />} />
        <Route path="/platform/tenants"   element={<PlatformTenantsPage />} />
      </Route>

      {/* Convenience redirect: /platform → /platform/dashboard */}
      <Route path="/platform" element={<Navigate to="/platform/dashboard" replace />} />

      {/* Root redirects to dashboard (ProtectedRoute handles unauth redirect) */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
