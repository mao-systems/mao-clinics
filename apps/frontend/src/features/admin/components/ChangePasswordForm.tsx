import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useChangePassword, type ChangePasswordData } from '../hooks/useChangePassword'

// ── Password strength ─────────────────────────────────────────────────────────

type Strength = 'none' | 'weak' | 'fair' | 'good' | 'strong'

function getStrength(pw: string): Strength {
  if (!pw)           return 'none'
  if (pw.length < 8) return 'weak'
  const hasUpper  = /[A-Z]/.test(pw)
  const hasDigit  = /[0-9]/.test(pw)
  if (hasUpper && hasDigit) return 'strong'
  if (hasUpper || hasDigit) return 'good'
  return 'fair'
}

const STRENGTH_CONFIG: Record<Exclude<Strength, 'none'>, { label: string; pct: string; color: string }> = {
  weak:   { label: 'Débil',    pct: '25%',  color: '#EF4444' },
  fair:   { label: 'Regular',  pct: '50%',  color: '#F59E0B' },
  good:   { label: 'Buena',    pct: '75%',  color: '#3B82F6' },
  strong: { label: 'Fuerte',   pct: '100%', color: '#10B981' },
}

function StrengthBar({ password }: { password: string }) {
  const strength = getStrength(password)
  if (strength === 'none') return null
  const cfg = STRENGTH_CONFIG[strength]
  return (
    <div className="mt-2">
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: cfg.pct, backgroundColor: cfg.color }}
        />
      </div>
      <p className="text-xs mt-1" style={{ color: cfg.color }}>{cfg.label}</p>
    </div>
  )
}

// ── Password field with show/hide toggle ──────────────────────────────────────

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label:       string
  value:       string
  onChange:    (v: string) => void
  placeholder?: string
  error?:      string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={[
            'w-full px-3 py-2 pr-10 text-sm border rounded-base focus:outline-none focus:ring-2 focus:ring-primary/40',
            error ? 'border-red-400' : 'border-gray-300',
          ].join(' ')}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChangePasswordForm() {
  const [form, setForm]       = useState<ChangePasswordData>({
    current_password: '',
    new_password:     '',
    confirm_password: '',
  })
  const [matchError, setMatchError] = useState('')
  const [done, setDone]             = useState(false)

  const mutation = useChangePassword()

  function set(key: keyof ChangePasswordData, val: string) {
    setForm(f => ({ ...f, [key]: val }))
    if (key !== 'current_password') setMatchError('')
    setDone(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.new_password !== form.confirm_password) {
      setMatchError('Las contraseñas no coinciden')
      return
    }

    if (getStrength(form.new_password) === 'weak') {
      setMatchError('La contraseña nueva es demasiado débil')
      return
    }

    mutation.mutate(form, {
      onSuccess: () => {
        setForm({ current_password: '', new_password: '', confirm_password: '' })
        setDone(true)
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordField
        label="Contraseña actual"
        value={form.current_password}
        onChange={v => set('current_password', v)}
      />

      <div>
        <PasswordField
          label="Nueva contraseña"
          value={form.new_password}
          onChange={v => set('new_password', v)}
          placeholder="Mínimo 8 caracteres"
        />
        <StrengthBar password={form.new_password} />
      </div>

      <PasswordField
        label="Confirmar nueva contraseña"
        value={form.confirm_password}
        onChange={v => set('confirm_password', v)}
        error={matchError}
      />

      {done && (
        <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-base px-3 py-2">
          ✓ Contraseña actualizada correctamente
        </p>
      )}

      <Button
        type="submit"
        size="sm"
        isLoading={mutation.isPending}
        disabled={!form.current_password || !form.new_password || !form.confirm_password}
      >
        Cambiar contraseña
      </Button>
    </form>
  )
}
