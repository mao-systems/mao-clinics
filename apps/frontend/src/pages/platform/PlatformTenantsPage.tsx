import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Loader2, Check } from 'lucide-react'
import { platformApi } from '@/lib/platformApi'
import { Spinner } from '@/components/ui/Spinner'

// ─── Types ────────────────────────────────────────────────────────────────────
interface TenantRow {
  id: string
  name: string
  subdomain: string
  ruc: string
  plan: string
  plan_price_soles: number
  active: boolean
  features: Record<string, boolean>
  _count: { users: number; patients: number; appointments: number }
}

// The 5 flags surfaced in the SuperAdmin panel — ordered for display
const DISPLAY_FLAGS: { key: string; label: string }[] = [
  { key: 'whatsapp_reminders', label: 'WhatsApp' },
  { key: 'hce',                label: 'HCE' },
  { key: 'billing',            label: 'Facturación' },
  { key: 'dashboard_kpis',    label: 'Dashboard' },
  { key: 'custom_theme',       label: 'Tema' },
]

const PLAN_OPTIONS = [
  { value: 'starter',      label: 'Starter' },
  { value: 'esencial',     label: 'Esencial' },
  { value: 'profesional',  label: 'Profesional' },
  { value: 'clinica',      label: 'Clínica' },
  { value: 'personalizado',label: 'Personalizado' },
]

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({
  checked,
  loading,
  onChange,
}: {
  checked: boolean
  loading: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => !loading && onChange(!checked)}
      disabled={loading}
      aria-pressed={checked}
      className={[
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
        checked ? 'bg-emerald-500 focus:ring-emerald-400' : 'bg-slate-300 focus:ring-slate-400',
        loading ? 'cursor-wait opacity-60' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 flex items-center justify-center',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      >
        {loading && <Loader2 size={10} className="animate-spin text-slate-400" />}
        {!loading && checked && <Check size={10} className="text-emerald-500" />}
      </span>
    </button>
  )
}

// ─── Create tenant form ───────────────────────────────────────────────────────
const createTenantSchema = z.object({
  name:            z.string().min(2, 'Mínimo 2 caracteres'),
  ruc:             z.string().regex(/^\d{11}$/, 'RUC: exactamente 11 dígitos'),
  subdomain:       z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  plan:            z.string().min(1),
  plan_price_soles:z.coerce.number().min(0),
  adminEmail:      z.string().email('Correo inválido'),
  adminPassword:   z.string().min(8, 'Mínimo 8 caracteres'),
  adminFirstName:  z.string().min(1, 'Requerido'),
  adminLastName:   z.string().min(1, 'Requerido'),
})
type CreateTenantFormValues = z.infer<typeof createTenantSchema>

function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTenantFormValues>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: { plan: 'starter', plan_price_soles: 599 },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateTenantFormValues) =>
      platformApi.post('/tenants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform', 'stats'] })
      onClose()
    },
  })

  function onSubmit(values: CreateTenantFormValues) {
    createMutation.mutate(values)
  }

  const fieldClass = (hasError: boolean) =>
    [
      'w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors',
      hasError
        ? 'border-red-400 bg-red-50 focus:ring-red-200'
        : 'border-slate-300 focus:ring-blue-200 focus:border-blue-400',
    ].join(' ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Nuevo cliente</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Tenant info */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Clínica</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nombre</label>
              <input {...register('name')} className={fieldClass(!!errors.name)} placeholder="Clínica ejemplo" />
              {errors.name && <p className="mt-0.5 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Subdominio</label>
              <input {...register('subdomain')} className={fieldClass(!!errors.subdomain)} placeholder="ejemplo" />
              {errors.subdomain && <p className="mt-0.5 text-xs text-red-600">{errors.subdomain.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">RUC (11 dígitos)</label>
              <input {...register('ruc')} className={fieldClass(!!errors.ruc)} placeholder="20123456789" />
              {errors.ruc && <p className="mt-0.5 text-xs text-red-600">{errors.ruc.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Plan</label>
              <select {...register('plan')} className={fieldClass(!!errors.plan)}>
                {PLAN_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Precio mensual (S/)</label>
            <input
              type="number"
              step="0.01"
              {...register('plan_price_soles')}
              className={fieldClass(!!errors.plan_price_soles)}
              placeholder="599"
            />
            {errors.plan_price_soles && <p className="mt-0.5 text-xs text-red-600">{errors.plan_price_soles.message}</p>}
          </div>

          {/* Admin user */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2">Administrador inicial</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nombre</label>
              <input {...register('adminFirstName')} className={fieldClass(!!errors.adminFirstName)} placeholder="Nombre" />
              {errors.adminFirstName && <p className="mt-0.5 text-xs text-red-600">{errors.adminFirstName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Apellido</label>
              <input {...register('adminLastName')} className={fieldClass(!!errors.adminLastName)} placeholder="Apellido" />
              {errors.adminLastName && <p className="mt-0.5 text-xs text-red-600">{errors.adminLastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Correo del admin</label>
            <input {...register('adminEmail')} type="email" className={fieldClass(!!errors.adminEmail)} placeholder="admin@clinica.maosystems.io" />
            {errors.adminEmail && <p className="mt-0.5 text-xs text-red-600">{errors.adminEmail.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Contraseña inicial</label>
            <input {...register('adminPassword')} type="password" className={fieldClass(!!errors.adminPassword)} placeholder="Mínimo 8 caracteres" />
            {errors.adminPassword && <p className="mt-0.5 text-xs text-red-600">{errors.adminPassword.message}</p>}
          </div>

          {createMutation.isError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-700">{(createMutation.error as Error).message}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {createMutation.isPending ? <><Spinner size="sm" className="text-white" />Creando…</> : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PlatformTenantsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  // Track which (tenantId, flagKey) is currently being toggled to show loading state
  const [toggling, setToggling] = useState<{ tenantId: string; flag: string } | null>(null)

  const { data: tenants, isLoading } = useQuery<TenantRow[]>({
    queryKey: ['platform', 'tenants'],
    queryFn: () =>
      platformApi.get<{ tenants: TenantRow[] }>('/tenants').then((d) => d.tenants),
  })

  const updateFeaturesMutation = useMutation({
    mutationFn: ({
      tenantId,
      features,
    }: {
      tenantId: string
      features: Record<string, boolean>
    }) => platformApi.patch(`/tenants/${tenantId}/features`, { features }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })
      setToggling(null)
    },
    onError: () => setToggling(null),
  })

  function handleToggle(tenant: TenantRow, flagKey: string, newValue: boolean) {
    setToggling({ tenantId: tenant.id, flag: flagKey })
    updateFeaturesMutation.mutate({
      tenantId: tenant.id,
      features: { [flagKey]: newValue },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 mt-1 text-sm">Gestiona módulos activos por cliente</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">MRR</th>
                {DISPLAY_FLAGS.map((f) => (
                  <th key={f.key} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {f.label}
                  </th>
                ))}
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pacientes</th>
              </tr>
            </thead>
            <tbody>
              {(tenants ?? []).map((tenant, idx) => (
                <tr
                  key={tenant.id}
                  className={[
                    'border-b border-slate-100 last:border-0',
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                  ].join(' ')}
                >
                  {/* Tenant name / subdomain */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{tenant.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{tenant.subdomain}</p>
                  </td>

                  {/* Plan label */}
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                      {tenant.plan}
                    </span>
                  </td>

                  {/* MRR */}
                  <td className="px-4 py-3 text-right text-slate-700 font-mono text-xs">
                    S/ {tenant.plan_price_soles.toLocaleString('es-PE')}
                  </td>

                  {/* Feature flag toggles */}
                  {DISPLAY_FLAGS.map((f) => {
                    const isOn = tenant.features?.[f.key] === true
                    const isLoading =
                      toggling?.tenantId === tenant.id && toggling.flag === f.key

                    return (
                      <td key={f.key} className="px-3 py-3 text-center">
                        <Toggle
                          checked={isOn}
                          loading={isLoading}
                          onChange={(val) => handleToggle(tenant, f.key, val)}
                        />
                      </td>
                    )
                  })}

                  {/* Patient count */}
                  <td className="px-4 py-3 text-right text-slate-500 text-xs">
                    {tenant._count.patients}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <p className="mt-3 text-xs text-slate-400">
        Los cambios se guardan instantáneamente. Actualiza la página del cliente para que tome efecto.
      </p>

      {showCreate && <CreateTenantModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
