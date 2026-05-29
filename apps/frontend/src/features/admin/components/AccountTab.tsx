import { useState } from 'react'
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useChangePassword, type ChangePasswordPayload } from '../hooks/useAdmin'
import { useAuth } from '@/hooks/useAuth'

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          required={required}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

// ── Password strength indicator ────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const hasLength = password.length >= 8
  const hasUpper  = /[A-Z]/.test(password)
  const hasDigit  = /[0-9]/.test(password)

  if (!password) return null

  const rules = [
    { ok: hasLength, label: 'Mínimo 8 caracteres' },
    { ok: hasUpper,  label: 'Al menos una mayúscula' },
    { ok: hasDigit,  label: 'Al menos un número' },
  ]

  return (
    <ul className="mt-2 space-y-1">
      {rules.map((r) => (
        <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>
          <CheckCircle2 size={11} className={r.ok ? 'text-green-500' : 'text-gray-300'} />
          {r.label}
        </li>
      ))}
    </ul>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AccountTab() {
  const { user } = useAuth()
  const changePassword = useChangePassword()

  const [form, setForm] = useState<ChangePasswordPayload>({
    current_password: '',
    new_password:     '',
    confirm_password: '',
  })
  const [matchError, setMatchError] = useState('')
  const [success, setSuccess]       = useState(false)

  function set<K extends keyof ChangePasswordPayload>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    if (key === 'confirm_password' || key === 'new_password') {
      setMatchError('')
    }
    setSuccess(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      setMatchError('Las contraseñas no coinciden')
      return
    }
    changePassword.mutate(form, {
      onSuccess: () => {
        setForm({ current_password: '', new_password: '', confirm_password: '' })
        setSuccess(true)
      },
    })
  }

  return (
    <div className="max-w-md">
      {/* Profile info */}
      <div className="bg-white border border-gray-200 rounded-base p-5 mb-5">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Change password form */}
      <div className="bg-white border border-gray-200 rounded-base p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={16} style={{ color: 'var(--color-primary)' }} />
          <h3 className="text-sm font-semibold text-gray-800">Cambiar contraseña</h3>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-base text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 size={14} />
            Contraseña actualizada correctamente
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            label="Contraseña actual"
            value={form.current_password}
            onChange={(v) => set('current_password', v)}
            required
          />

          <PasswordInput
            label="Nueva contraseña"
            value={form.new_password}
            onChange={(v) => set('new_password', v)}
            placeholder="Mínimo 8 caracteres"
            required
          />
          <PasswordStrength password={form.new_password} />

          <PasswordInput
            label="Confirmar nueva contraseña"
            value={form.confirm_password}
            onChange={(v) => set('confirm_password', v)}
            required
          />
          {matchError && (
            <p className="text-xs text-red-500">{matchError}</p>
          )}

          <div className="pt-1">
            <Button
              type="submit"
              size="sm"
              isLoading={changePassword.isPending}
              disabled={!form.current_password || !form.new_password || !form.confirm_password}
            >
              Actualizar contraseña
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
