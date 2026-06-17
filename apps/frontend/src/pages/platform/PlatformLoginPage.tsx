import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { usePlatformAuth, usePlatformLogin } from '@/hooks/usePlatformAuth'
import { Spinner } from '@/components/ui/Spinner'

const schema = z.object({
  email: z.string().email('Ingrese un correo válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})
type FormValues = z.infer<typeof schema>

// MAO Systems brand palette — used throughout the platform panel
const BRAND_PRIMARY = '#1A5F9E'

export default function PlatformLoginPage() {
  const { isAuthenticated, isLoading: authLoading } = usePlatformAuth()
  const loginMutation = usePlatformLogin()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/platform/dashboard" replace />
  }

  function onSubmit(values: FormValues) {
    loginMutation.mutate({ email: values.email, password: values.password })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-slate-200">

        {/* Brand header */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MAO Systems</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Panel de administración de plataforma</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="superadmin@maosystems.io"
              {...register('email')}
              className={[
                'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors',
                errors.email
                  ? 'border-red-400 bg-red-50 focus:ring-red-200'
                  : 'border-slate-300 focus:ring-blue-200 focus:border-blue-400',
              ].join(' ')}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Contraseña"
                {...register('password')}
                className={[
                  'w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors',
                  errors.password
                    ? 'border-red-400 bg-red-50 focus:ring-red-200'
                    : 'border-slate-300 focus:ring-blue-200 focus:border-blue-400',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {loginMutation.isError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{(loginMutation.error as Error).message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full flex items-center justify-center gap-2 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            {loginMutation.isPending ? (
              <><Spinner size="sm" className="text-white" />Ingresando…</>
            ) : (
              'Ingresar al panel'
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        MAO Systems — Panel exclusivo para el equipo interno
      </p>
    </div>
  )
}
