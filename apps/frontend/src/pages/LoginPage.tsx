import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Check } from 'lucide-react'
import { useAuth, useLogin } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'

// ── Brand config ──────────────────────────────────────────────────────────────
// Change PRODUCT_NAME here to update the name across the login page.
// The custom per-tenant name/logo is shown only after login (via theme_config).
const PRODUCT_NAME = 'Clinova'

// ── Stethoscope icon (inline SVG — no extra dependency) ───────────────────────
function StethoscopeIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-3" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  )
}

// ── Error messages ─────────────────────────────────────────────────────────────

function getLoginErrorMessage(err: Error): string {
  const msg = err.message ?? ''
  if (msg.includes('INVALID_CREDENTIALS') || msg.includes('Correo'))
    return 'Correo o contraseña incorrectos'
  if (msg.includes('TOO_MANY_REQUESTS') || msg.includes('intentos'))
    return 'Demasiados intentos. Espera 15 minutos.'
  if (msg.includes('inactive') || msg.includes('desactivad'))
    return 'Tu cuenta está desactivada. Contacta al administrador.'
  return 'Error al iniciar sesión. Inténtalo de nuevo.'
}

// ── Schema ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email('Ingrese un correo válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginFormValues = z.infer<typeof loginSchema>

// ── Value proposition bullets (left panel) ───────────────────────────────────

const VALUE_PROPS = [
  'Agenda de citas en tiempo real',
  'Historia clínica electrónica (HCE)',
  'Recordatorios por WhatsApp automáticos',
  'Facturación electrónica a SUNAT',
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const loginMutation = useLogin()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate({ email: values.email, password: values.password })
  }

  const inputBase = [
    'w-full px-3 py-2.5 border rounded-lg text-sm',
    'focus:outline-none focus:ring-2 focus:ring-[#1a5f9e]/30 focus:border-[#1a5f9e]',
    'transition-colors placeholder:text-gray-400',
  ].join(' ')

  return (
    <div className="min-h-screen flex">

      {/* ── Left brand panel (hidden on mobile) ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-[42%] flex-col justify-between bg-[#1a2740] p-10 xl:p-14 relative overflow-hidden select-none">

        {/* Decorative background circles */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-white/[0.02]" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1a5f9e] flex items-center justify-center shadow-lg shadow-[#1a5f9e]/30">
            <StethoscopeIcon size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">{PRODUCT_NAME}</span>
        </div>

        {/* Headline + bullets */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight text-white mb-3">
              Tu clínica,<br />
              <span className="text-[#2eaa6e]">lista para operar</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Agenda, historiales, WhatsApp y facturación SUNAT — todo en un solo sistema.
            </p>
          </div>

          <ul className="space-y-3.5">
            {VALUE_PROPS.map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-5 h-5 rounded-full bg-[#2eaa6e]/20 border border-[#2eaa6e]/40 flex items-center justify-center flex-shrink-0">
                  <Check size={10} className="text-[#2eaa6e]" strokeWidth={3} />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-slate-500 text-xs">
            Confiado por clínicas y consultorios en Lima, Perú
          </p>
          <p className="text-slate-600 text-xs mt-1">
            © {new Date().getFullYear()} MAO Systems
          </p>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12 lg:px-10 xl:px-16">

        {/* Mobile-only mini brand */}
        <div className="flex items-center gap-2.5 mb-10 lg:hidden">
          <div className="w-9 h-9 rounded-xl bg-[#1a2740] flex items-center justify-center">
            <StethoscopeIcon size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">{PRODUCT_NAME}</span>
        </div>

        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
            <p className="text-sm text-gray-500 mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="correo@tuclinica.com"
                {...register('email')}
                className={[
                  inputBase,
                  errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300',
                ].join(' ')}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={[
                    inputBase,
                    'pr-10',
                    errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300',
                  ].join(' ')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {loginMutation.isError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">
                  {getLoginErrorMessage(loginMutation.error as Error)}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-[#1a2740] hover:bg-[#243450] disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors mt-2"
            >
              {loginMutation.isPending ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Ingresando…
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-7 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3.5">
            <p className="text-xs font-semibold text-slate-600 mb-1">Cuenta de demostración</p>
            <p className="text-xs text-slate-500 font-mono leading-relaxed">
              admin@sanrafael.maosystems.io<br />
              Demo2026!
            </p>
          </div>

          {/* Support note */}
          <p className="mt-6 text-center text-xs text-gray-400">
            ¿Problemas para acceder?{' '}
            <span className="text-gray-600 font-medium">Contacta a tu administrador</span>
          </p>
        </div>
      </div>
    </div>
  )
}
