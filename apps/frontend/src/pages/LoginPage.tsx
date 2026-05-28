import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth, useLogin } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'

const loginSchema = z.object({
  email: z.string().email('Ingrese un correo válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginFormValues = z.infer<typeof loginSchema>

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

  // If already authenticated, skip the login page entirely
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate({ email: values.email, password: values.password })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-surface)] px-4">
      {/* Login card */}
      <div className="w-full max-w-md bg-white rounded-base shadow-lg p-8">

        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)] mb-3">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MAO Clinics</h1>
          <p className="text-gray-500 mt-1 text-sm">Iniciar sesión</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="correo@clinica.com"
              {...register('email')}
              className={[
                'w-full px-3 py-2 border rounded-base text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors',
                errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300',
              ].join(' ')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
                  'w-full px-3 py-2 pr-10 border rounded-base text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors',
                  errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Server error */}
          {loginMutation.isError && (
            <div className="rounded-base bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">
                {(loginMutation.error as Error).message ?? 'Error al iniciar sesión. Inténtelo de nuevo.'}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-base text-sm font-medium transition-colors"
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
        <div className="mt-6 rounded-base bg-blue-50 border border-blue-100 px-4 py-3">
          <p className="text-xs text-blue-700 font-medium mb-0.5">Usuario demo</p>
          <p className="text-xs text-blue-600 font-mono">
            admin@sanrafael.maosystems.io
          </p>
          <p className="text-xs text-blue-600 font-mono">Demo2026!</p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-gray-400 text-center">
        MAO Systems — Sistema de gestión para clínicas
      </p>
    </div>
  )
}
