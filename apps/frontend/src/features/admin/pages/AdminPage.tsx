import { useEffect, useState } from 'react'
import {
  Plus, Pencil, Trash2, RotateCcw, ShieldCheck,
  ChevronDown, ChevronRight, Users, Stethoscope,
  Tag, Palette, UserCircle, LogOut, BookOpen,
} from 'lucide-react'
import { PageHeader }         from '@/components/layout/PageHeader'
import { Modal }              from '@/components/ui/Modal'
import { Button }             from '@/components/ui/Button'
import { Badge }              from '@/components/ui/Badge'
import { ThemeEditor }        from '../components/ThemeEditor'
import { DoctorCard }         from '../components/DoctorCard'
import { DoctorForm }         from '../components/DoctorForm'
import { UserForm }           from '../components/UserForm'
import { ServiceForm }        from '../components/ServiceForm'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { useAdminDoctors, useToggleDoctorActive, type DoctorWithRelations } from '../hooks/useAdminDoctors'
import { useAdminUsers, type AdminUser }             from '../hooks/useAdminUsers'
import { useAdminServices, useDeleteService, type ServiceItem } from '../hooks/useAdminServices'
import { useAdminSpecialties, useCreateSpecialty, useUpdateSpecialty, useDeleteSpecialty, type SpecialtyItem } from '../hooks/useAdminSpecialties'
import { useAuth }            from '@/hooks/useAuth'
import { useFeatureFlag }    from '@/hooks/useFeatureFlag'

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabId = 'apariencia' | 'medicos' | 'usuarios' | 'servicios' | 'especialidades' | 'mi-cuenta'

interface Tab { id: TabId; label: string; icon: React.ReactNode; adminOnly: boolean }

const TABS: Tab[] = [
  { id: 'apariencia',     label: 'Apariencia',     icon: <Palette size={14} />,     adminOnly: true  },
  { id: 'medicos',        label: 'Médicos',         icon: <Stethoscope size={14} />, adminOnly: true  },
  { id: 'usuarios',       label: 'Usuarios',        icon: <Users size={14} />,       adminOnly: true  },
  { id: 'servicios',      label: 'Servicios',       icon: <Tag size={14} />,         adminOnly: true  },
  { id: 'especialidades', label: 'Especialidades',  icon: <BookOpen size={14} />,    adminOnly: true  },
  { id: 'mi-cuenta',      label: 'Mi cuenta',       icon: <UserCircle size={14} />,  adminOnly: false },
]

const VALID_HASHES = new Set<TabId>(['apariencia', 'medicos', 'usuarios', 'servicios', 'especialidades', 'mi-cuenta'])

function getInitialTab(isAdmin: boolean, hasCustomTheme: boolean): TabId {
  const hash = window.location.hash.slice(1) as TabId
  if (VALID_HASHES.has(hash)) {
    if (!isAdmin && hash !== 'mi-cuenta') return 'mi-cuenta'
    // Don't land on apariencia if the tenant doesn't have custom_theme
    if (hash === 'apariencia' && !hasCustomTheme) return isAdmin ? 'medicos' : 'mi-cuenta'
    return hash
  }
  if (!isAdmin) return 'mi-cuenta'
  return hasCustomTheme ? 'apariencia' : 'medicos'
}

// ── Date helper ───────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone:  'America/Lima',
  }).format(new Date(iso))
}

// ── Role label ────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  admin:        'Administrador',
  receptionist: 'Recepcionista',
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 rounded-base animate-pulse" />
      ))}
    </div>
  )
}

// ── Doctors tab ───────────────────────────────────────────────────────────────

function DoctorsTab() {
  const { data: doctors = [], isLoading } = useAdminDoctors()
  const toggleActive                       = useToggleDoctorActive()

  const [editTarget,   setEditTarget]   = useState<DoctorWithRelations | null | undefined>(undefined)
  const [toggleTarget, setToggleTarget] = useState<DoctorWithRelations | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Médicos del consultorio</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {doctors.filter(d => d.active).length} activos · {doctors.length} en total
          </p>
        </div>
        <Button size="sm" onClick={() => setEditTarget(null)}>
          <Plus size={14} className="mr-1.5" />
          Agregar médico
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-base animate-pulse" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-base text-center">
          <Stethoscope className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">No hay médicos registrados</p>
          <p className="text-gray-400 text-sm mt-1">Agrega el primer médico para comenzar</p>
          <Button size="sm" className="mt-4" onClick={() => setEditTarget(null)}>
            Agregar primer médico
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctors.map(d => (
            <DoctorCard
              key={d.id}
              doctor={d}
              onEdit={() => setEditTarget(d)}
              onToggle={() => setToggleTarget(d)}
            />
          ))}
        </div>
      )}

      {/* Create / edit form */}
      {editTarget !== undefined && (
        <DoctorForm
          doctor={editTarget ?? undefined}
          onClose={() => setEditTarget(undefined)}
        />
      )}

      {/* Toggle active confirm */}
      <Modal
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        title={toggleTarget?.active ? 'Desactivar médico' : 'Activar médico'}
        size="sm"
      >
        {toggleTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {toggleTarget.active
                ? `¿Desactivar a Dr. ${toggleTarget.user.first_name} ${toggleTarget.user.last_name}? No aparecerá disponible para nuevas citas.`
                : `¿Activar a Dr. ${toggleTarget.user.first_name} ${toggleTarget.user.last_name}? Volverá a aparecer disponible para citas.`}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setToggleTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant={toggleTarget.active ? 'danger' : 'primary'}
                size="sm"
                isLoading={toggleActive.isPending}
                onClick={() => {
                  toggleActive.mutate(
                    { id: toggleTarget.id, active: !toggleTarget.active },
                    { onSuccess: () => setToggleTarget(null) },
                  )
                }}
              >
                {toggleTarget.active ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const { user: me }                       = useAuth()
  const { data: users = [], isLoading }    = useAdminUsers()
  const [editTarget, setEditTarget]        = useState<AdminUser | null | undefined>(undefined)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Usuarios del sistema</h2>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} usuario{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setEditTarget(null)}>
          <Plus size={14} className="mr-1.5" />
          Agregar usuario
        </Button>
      </div>
      <p className="text-xs text-gray-400 mb-4">Los médicos se gestionan en la pestaña Médicos.</p>

      <div className="bg-white border border-gray-200 rounded-base overflow-hidden">
        {isLoading ? (
          <div className="p-4"><Skeleton rows={3} /></div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3 hidden md:table-cell">Último acceso</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => {
                const isSelf = u.id === me?.id
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                          style={{ backgroundColor: u.active ? 'var(--color-secondary)' : '#9CA3AF' }}
                        >
                          {u.first_name[0]}{u.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">
                            {u.first_name} {u.last_name}
                            {isSelf && <span className="ml-1 text-xs text-gray-400">(tú)</span>}
                          </p>
                          {u.must_change_password && (
                            <p className="text-xs text-amber-600">Contraseña temporal</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <ShieldCheck size={12} />
                        {ROLE_LABEL[u.role] ?? u.role}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                      {formatDate(u.last_login_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.active ? 'success' : 'warning'}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditTarget(u)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-gray-100 transition-colors"
                        title="Editar usuario"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {editTarget !== undefined && (
        <UserForm
          user={editTarget ?? undefined}
          onClose={() => setEditTarget(undefined)}
        />
      )}
    </div>
  )
}

// ── Services tab ──────────────────────────────────────────────────────────────

function ServicesTab() {
  const { data: services = [], isLoading } = useAdminServices()
  const deleteMutation                      = useDeleteService()

  const [editTarget,   setEditTarget]   = useState<ServiceItem | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null)
  const [collapsed,    setCollapsed]    = useState<Set<string>>(new Set())

  // Group by category
  const grouped = services.reduce<Record<string, ServiceItem[]>>((acc, s) => {
    const cat = s.category ?? 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const activeCount = services.filter(s => s.active).length

  function toggleCollapse(cat: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Catálogo de servicios</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeCount} activos · {services.length} en total
          </p>
        </div>
        <Button size="sm" onClick={() => setEditTarget(null)}>
          <Plus size={14} className="mr-1.5" />
          Agregar servicio
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-base p-4">
          <Skeleton rows={4} />
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-base text-center">
          <Tag className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 font-medium">No hay servicios en el catálogo</p>
          <Button size="sm" className="mt-4" onClick={() => setEditTarget(null)}>
            Agregar primer servicio
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([cat, items]) => {
            const isOpen = !collapsed.has(cat)
            return (
              <div key={cat} className="bg-white border border-gray-200 rounded-base overflow-hidden">
                {/* Category header */}
                <button
                  type="button"
                  onClick={() => toggleCollapse(cat)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100 text-left hover:bg-gray-100 transition-colors"
                >
                  {isOpen ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{cat}</span>
                  <span className="text-xs text-gray-400 ml-auto">{items.length} servicio{items.length !== 1 ? 's' : ''}</span>
                </button>

                {/* Rows */}
                {isOpen && (
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {items.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className={`font-medium ${s.active ? 'text-gray-800' : 'text-gray-400'}`}>
                              {s.name}
                            </p>
                            {s.description && (
                              <p className="text-xs text-gray-400 truncate max-w-xs">{s.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-right" style={{ color: 'var(--color-primary)' }}>
                            S/ {parseFloat(s.price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={s.active ? 'success' : 'warning'}>
                              {s.active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => setEditTarget(s)}
                                className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-gray-100 transition-colors"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(s)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editTarget !== undefined && (
        <ServiceForm
          service={editTarget ?? undefined}
          onClose={() => setEditTarget(undefined)}
        />
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar servicio"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Eliminar <span className="font-medium">"{deleteTarget.name}"</span>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  })
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Specialties tab ───────────────────────────────────────────────────────────

function SpecialtiesTab() {
  const { data: specialties = [], isLoading } = useAdminSpecialties()
  const createMutation = useCreateSpecialty()
  const updateMutation = useUpdateSpecialty()
  const deleteMutation = useDeleteSpecialty()

  const [editTarget,   setEditTarget]   = useState<SpecialtyItem | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<SpecialtyItem | null>(null)
  const [formName,     setFormName]     = useState('')
  const [formError,    setFormError]    = useState('')

  const activeCount = specialties.filter(s => s.active).length

  function openCreate() {
    setFormName('')
    setFormError('')
    setEditTarget(null)
  }

  function openEdit(s: SpecialtyItem) {
    setFormName(s.name)
    setFormError('')
    setEditTarget(s)
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = formName.trim()
    if (!name) { setFormError('El nombre es obligatorio'); return }

    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data: { name } },
        { onSuccess: () => setEditTarget(undefined) },
      )
    } else {
      createMutation.mutate(
        { name, active: true, sort_order: specialties.length },
        { onSuccess: () => setEditTarget(undefined) },
      )
    }
  }

  const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Especialidades médicas</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeCount} activas · {specialties.length} en total
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} className="mr-1.5" />
          Agregar especialidad
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-base p-4">
          <Skeleton rows={4} />
        </div>
      ) : specialties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-base text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 font-medium">No hay especialidades configuradas</p>
          <p className="text-xs text-gray-400 mt-1">Agrega las especialidades de tu consultorio</p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            Agregar primera especialidad
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Especialidad</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {specialties.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className={`font-medium ${s.active ? 'text-gray-800' : 'text-gray-400'}`}>
                        {s.name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.active ? 'success' : 'warning'}>
                        {s.active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-gray-100 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            updateMutation.mutate({ id: s.id, data: { active: !s.active } })
                          }}
                          className="p-1.5 text-gray-400 hover:text-amber-500 rounded hover:bg-gray-100 transition-colors"
                          title={s.active ? 'Desactivar' : 'Activar'}
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={editTarget !== undefined}
        onClose={() => setEditTarget(undefined)}
        title={editTarget ? 'Editar especialidad' : 'Nueva especialidad'}
        size="sm"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              value={formName}
              onChange={e => { setFormName(e.target.value); setFormError('') }}
              className={inp}
              placeholder="Ej: Medicina General"
            />
            {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditTarget(undefined)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editTarget ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar especialidad"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Eliminar <span className="font-medium">"{deleteTarget.name}"</span>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  })
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── My account tab ────────────────────────────────────────────────────────────

function MyAccountTab() {
  const { user, logout } = useAuth()

  const ROLE_ES: Record<string, string> = {
    admin:        'Administrador',
    receptionist: 'Recepcionista',
    doctor:       'Médico',
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Profile */}
      <div className="bg-white border border-gray-200 rounded-base p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Información personal</h3>
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-800">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {ROLE_ES[user?.role ?? ''] ?? user?.role}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Para cambiar nombre o email, contacta al administrador del sistema.
        </p>
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-200 rounded-base p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Cambiar contraseña</h3>
        <ChangePasswordForm />
      </div>

      {/* Sessions */}
      <div className="bg-white border border-gray-200 rounded-base p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Sesiones activas</h3>
        <p className="text-xs text-gray-500 mb-4">
          Última sesión registrada:{' '}
          <span className="font-medium text-gray-700">
            {formatDate((user as (typeof user & { lastLoginAt?: string }) | null)?.lastLoginAt)}
          </span>
        </p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors"
        >
          <LogOut size={14} />
          Cerrar sesión en todos los dispositivos
        </button>
      </div>
    </div>
  )
}

// ── AdminPage ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user }       = useAuth()
  const isAdmin        = user?.role === 'admin'
  const hasCustomTheme = useFeatureFlag('custom_theme')

  const visibleTabs = TABS.filter(t => {
    if (t.adminOnly && !isAdmin) return false
    // Hide the Apariencia (theme editor) tab when the custom_theme flag is off
    if (t.id === 'apariencia' && !hasCustomTheme) return false
    return true
  })

  const [activeTab, setActiveTab] = useState<TabId>(() => getInitialTab(isAdmin, hasCustomTheme))

  // Keep URL hash in sync with active tab
  useEffect(() => {
    window.history.replaceState(null, '', `#${activeTab}`)
  }, [activeTab])

  // Guard tab access when role or feature flags change mid-session
  useEffect(() => {
    if (!isAdmin && activeTab !== 'mi-cuenta') {
      setActiveTab('mi-cuenta')
    } else if (activeTab === 'apariencia' && !hasCustomTheme) {
      setActiveTab(isAdmin ? 'medicos' : 'mi-cuenta')
    }
  }, [isAdmin, hasCustomTheme, activeTab])

  const tabContent: Record<TabId, React.ReactNode> = {
    apariencia:     <ThemeEditor />,
    medicos:        <DoctorsTab />,
    usuarios:       <UsersTab />,
    servicios:      <ServicesTab />,
    especialidades: <SpecialtiesTab />,
    'mi-cuenta':    <MyAccountTab />,
  }

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Administra tu clínica, equipo y personalización"
      />

      {/* Tab navigation — scrollable on mobile */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="flex -mb-px gap-0.5 min-w-max">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tabContent[activeTab]}
    </div>
  )
}
