import { useCallback, useState } from 'react'
import { UserPlus } from 'lucide-react'
import type { Patient } from '@mao-systems/shared'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useDeletePatient, usePatients } from '../hooks/usePatients'
import { PatientSearchBar } from '../components/PatientSearchBar'
import { PatientTable } from '../components/PatientTable'
import { PatientForm } from '../components/PatientForm'

export default function PatientsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  // Search + district filters
  const [searchFilters, setSearchFilters] = useState({ q: '', district: '' })

  // Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  // Form modal
  const [showForm, setShowForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)

  const handleSearchChange = useCallback(
    (filters: { q: string; district: string }) => {
      setSearchFilters(filters)
      setPage(1) // reset to page 1 on new search
    },
    [],
  )

  const filters = {
    q: searchFilters.q || undefined,
    district: searchFilters.district || undefined,
    page,
    limit,
  }

  const { data, isLoading, isFetching } = usePatients(filters)
  const deletePatient = useDeletePatient()

  const patients = data?.data ?? []
  const meta = data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 }

  function openCreateModal() {
    setEditingPatient(null)
    setShowForm(true)
  }

  function openEditModal(patient: Patient) {
    setEditingPatient(patient)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingPatient(null)
  }

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle={`${meta.total} paciente${meta.total !== 1 ? 's' : ''} registrados`}
        actions={
          (isAdmin || user?.role === 'receptionist') && (
            <Button onClick={openCreateModal} size="sm">
              <UserPlus size={15} className="mr-1.5" />
              Nuevo paciente
            </Button>
          )
        }
      />

      <div className="mb-4">
        <PatientSearchBar onChange={handleSearchChange} />
      </div>

      <PatientTable
        patients={patients}
        isLoading={isLoading}
        isFetching={isFetching}
        pagination={{
          page,
          setPage,
          limit,
          setLimit: (l) => { setLimit(l); setPage(1) },
          total: meta.total,
          totalPages: meta.totalPages,
        }}
        onNew={openCreateModal}
        onEdit={openEditModal}
        onDelete={(id) => deletePatient.mutate(id)}
        isAdmin={isAdmin}
      />

      {showForm && (
        <PatientForm
          patient={editingPatient}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
