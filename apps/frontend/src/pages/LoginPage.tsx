import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Auth logic wired in Step 03
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // POST /api/v1/auth/login
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-md bg-white rounded-base shadow-lg p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">MAO Clinics</h1>
          <p className="text-gray-500 mt-1 text-sm">Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-base text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="correo@clinica.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-base text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-2 px-4 rounded-base text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
