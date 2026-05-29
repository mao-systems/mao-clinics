import { useState } from 'react'
import { Lock, RotateCcw } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  useCreateUser,
  useUpdateUser,
  useResetUserPassword,
  type AdminUser,
  type CreateUserData,
  type UpdateUserData,
} from '../hooks/useAdminUsers'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  user?:    AdminUser
  onClose:  () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UserForm({ user, onClose }: Props) {
  const isEdit = !!user

  const [form, setForm] = useState({
    first_name: user?.first_name ?? '',
    last_name:  user?.last_name  ?? '',
    email:      user?.email      ?? '',
    role:       user?.role       ?? ('receptionist' as 'admin' | 'receptionist'),
    active:     user?.active     ?? true,
  })

  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const resetMutation  = useResetUserPassword()
  const isPending      = createMutation.isPending || updateMutation.isPending

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEdit && user) {
      const data: UpdateUserData = {
        first_name: form.first_name,
        last_name:  form.last_name,
        role:       form.role,
        active:     form.active,
      }
      updateMutation.mutate({ id: user.id, data }, { onSuccess: onClose })
    } else {
      const data: CreateUserData = {
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email,
        role:       form.role,
      }
      createMutation.mutate(data, { onSuccess: onClose })
    }
  }

  const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Names */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombres <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              className={inp}
              placeholder="María"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Apellidos <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              className={inp}
              placeholder="López Quispe"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              required={!isEdit}
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              disabled={isEdit}
              className={`${inp} ${isEdit ? 'bg-gray-50 text-gray-400 pr-9 cursor-not-allowed' : ''}`}
              placeholder="usuario@clinica.pe"
            />
            {isEdit && (
              <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            )}
          </div>
          {!isEdit && (
            <p className="text-xs text-gray-400 mt-1">Se enviará email con contraseña temporal.</p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Rol <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {([
              {
                value:    'receptionist',
                label:    'Recepcionista',
                desc:     'Puede agendar citas y registrar pacientes',
              },
              {
                value:    'admin',
                label:    'Administrador',
                desc:     'Acceso total a la configuración del sistema',
              },
            ] as const).map(opt => (
              <label
                key={opt.value}
                className={[
                  'flex items-start gap-3 p-3 rounded-base border cursor-pointer transition-colors',
                  form.role === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={form.role === opt.value}
                  onChange={() => set('role', opt.value)}
                  className="mt-0.5"
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Active toggle — edit mode only */}
        {isEdit && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="rounded"
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span className="text-sm text-gray-700">Cuenta activa</span>
          </label>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {/* Reset password button — edit mode only */}
          {isEdit && user && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 transition-colors"
            >
              <RotateCcw size={12} />
              Restablecer contraseña
            </button>
          )}

          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isPending}>
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </div>
      </form>

      {/* Reset password confirmation */}
      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Restablecer contraseña"
        size="sm"
      >
        {user && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Estás seguro? Se generará una nueva contraseña temporal y se enviará al email{' '}
              <span className="font-medium">{user.email}</span>.
            </p>
            <p className="text-xs text-gray-400">
              El usuario deberá cambiarla en su próximo inicio de sesión.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                isLoading={resetMutation.isPending}
                onClick={() => {
                  resetMutation.mutate(user.id, {
                    onSuccess: () => {
                      setShowResetConfirm(false)
                      onClose()
                    },
                  })
                }}
              >
                Restablecer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Modal>
  )
}
