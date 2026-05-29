import { useState } from 'react'
import { Plus, Pencil, RotateCcw, ShieldCheck, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useResetUserPassword,
  type AdminUser,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '../hooks/useAdmin'
import { useAuth } from '@/hooks/useAuth'

// ── Role labels ───────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  admin:        'Administrador',
  receptionist: 'Recepcionista',
}

// ── User form modal ───────────────────────────────────────────────────────────

interface FormState {
  first_name: string
  last_name:  string
  email:      string
  role:       'admin' | 'receptionist'
  active:     boolean
}

function UserFormModal({
  user,
  onClose,
}: {
  user: AdminUser | null
  onClose: () => void
}) {
  const isEdit = !!user
  const [form, setForm] = useState<FormState>({
    first_name: user?.first_name ?? '',
    last_name:  user?.last_name  ?? '',
    email:      user?.email      ?? '',
    role:       user?.role       ?? 'receptionist',
    active:     user?.active     ?? true,
  })

  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const isPending = createMutation.isPending || updateMutation.isPending

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEdit && user) {
      const data: UpdateUserPayload = {
        first_name: form.first_name,
        last_name:  form.last_name,
        role:       form.role,
        active:     form.active,
      }
      updateMutation.mutate({ id: user.id, data }, { onSuccess: onClose })
    } else {
      const payload: CreateUserPayload = {
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email,
        role:       form.role,
      }
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.first_name}
              onChange={(e) => set('first_name', e.target.value)}
              className={inputCls}
              placeholder="María"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Apellido <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.last_name}
              onChange={(e) => set('last_name', e.target.value)}
              className={inputCls}
              placeholder="López"
            />
          </div>
        </div>

        {!isEdit && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputCls}
              placeholder="usuario@clinica.pe"
            />
            <p className="text-xs text-gray-400 mt-1">Se enviará un correo con la contraseña temporal.</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Rol</label>
          <select
            value={form.role}
            onChange={(e) => set('role', e.target.value as 'admin' | 'receptionist')}
            className={inputCls}
          >
            <option value="receptionist">Recepcionista</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        {isEdit && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set('active', e.target.checked)}
              className="rounded"
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span className="text-sm text-gray-700">Cuenta activa</span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="submit" size="sm" isLoading={isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 animate-pulse">
      <div className="w-9 h-9 bg-gray-200 rounded-full" />
      <div className="flex-1 space-y-1">
        <div className="h-3.5 bg-gray-200 rounded w-36" />
        <div className="h-3 bg-gray-100 rounded w-48" />
      </div>
      <div className="h-5 bg-gray-100 rounded w-24" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function UsersTab() {
  const { user: currentUser }             = useAuth()
  const { data: users = [], isLoading }   = useAdminUsers()
  const resetPassword                     = useResetUserPassword()

  const [formTarget,    setFormTarget]    = useState<AdminUser | null | undefined>(undefined)
  const [resetTarget,   setResetTarget]   = useState<AdminUser | null>(null)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {users.length} usuario{users.length !== 1 ? 's' : ''} (sin contar doctores)
        </p>
        <Button size="sm" onClick={() => setFormTarget(null)}>
          <Plus size={14} className="mr-1.5" />
          Nuevo usuario
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-base overflow-hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id
              return (
                <div key={u.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ backgroundColor: u.active ? 'var(--color-secondary)' : '#9CA3AF' }}
                  >
                    {u.first_name[0]}{u.last_name[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800">
                        {u.first_name} {u.last_name}
                        {isSelf && <span className="text-xs text-gray-400 ml-1">(tú)</span>}
                      </p>
                      {!u.active && <Badge variant="warning">Inactivo</Badge>}
                      {u.must_change_password && (
                        <Badge variant="info">Debe cambiar contraseña</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>

                  {/* Role */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <ShieldCheck size={13} />
                    <span>{ROLE_LABEL[u.role] ?? u.role}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFormTarget(u)}
                      className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-gray-100 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setResetTarget(u)}
                      disabled={isSelf}
                      className="p-1.5 text-gray-400 hover:text-orange-500 rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Restablecer contraseña"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create / Edit form */}
      {formTarget !== undefined && (
        <UserFormModal
          user={formTarget}
          onClose={() => setFormTarget(undefined)}
        />
      )}

      {/* Reset password confirm */}
      <Modal
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Restablecer contraseña"
        size="sm"
      >
        {resetTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Se generará una nueva contraseña temporal para{' '}
              <span className="font-medium">{resetTarget.first_name} {resetTarget.last_name}</span>{' '}
              y se enviará a <span className="font-medium">{resetTarget.email}</span>.
            </p>
            <p className="text-xs text-gray-400">
              El usuario deberá cambiarla en su próximo inicio de sesión.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setResetTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={resetPassword.isPending}
                onClick={() => {
                  resetPassword.mutate(resetTarget.id, {
                    onSuccess: () => setResetTarget(null),
                  })
                }}
              >
                Restablecer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
