import { useState } from 'react'
import { Plus, Pencil, Trash2, Tag, ToggleLeft, ToggleRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useAdminServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  type ServiceCatalogItem,
  type CreateServicePayload,
  type UpdateServicePayload,
} from '../hooks/useAdmin'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: string): string {
  const n = parseFloat(price)
  return isNaN(n) ? price : `S/ ${n.toFixed(2)}`
}

// ── Service form modal ────────────────────────────────────────────────────────

interface FormState {
  name:        string
  description: string
  price:       string
  category:    string
  active:      boolean
  sort_order:  number
}

function ServiceFormModal({
  service,
  onClose,
}: {
  service: ServiceCatalogItem | null
  onClose: () => void
}) {
  const isEdit = !!service
  const [form, setForm] = useState<FormState>({
    name:        service?.name        ?? '',
    description: service?.description ?? '',
    price:       service?.price       ?? '',
    category:    service?.category    ?? '',
    active:      service?.active      ?? true,
    sort_order:  service?.sort_order  ?? 0,
  })
  const [priceError, setPriceError] = useState('')

  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const isPending = createMutation.isPending || updateMutation.isPending

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function validatePrice(v: string): boolean {
    if (/^\d+(\.\d{1,2})?$/.test(v)) {
      setPriceError('')
      return true
    }
    setPriceError('Ingresa un precio válido (ej. 50 o 50.00)')
    return false
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validatePrice(form.price)) return

    if (isEdit && service) {
      const data: UpdateServicePayload = {
        name:        form.name,
        description: form.description || null,
        price:       form.price,
        category:    form.category || null,
        active:      form.active,
        sort_order:  form.sort_order,
      }
      updateMutation.mutate({ id: service.id, data }, { onSuccess: onClose })
    } else {
      const payload: CreateServicePayload = {
        name:        form.name,
        description: form.description || null,
        price:       form.price,
        category:    form.category || null,
        active:      form.active,
        sort_order:  form.sort_order,
      }
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar servicio' : 'Nuevo servicio'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputCls}
            placeholder="Consulta médica general"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className={`${inputCls} resize-none`}
            placeholder="Descripción breve del servicio..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Precio (S/) <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.price}
              onChange={(e) => {
                set('price', e.target.value)
                if (priceError) validatePrice(e.target.value)
              }}
              onBlur={() => validatePrice(form.price)}
              className={`${inputCls} ${priceError ? 'border-red-400' : ''}`}
              placeholder="50.00"
            />
            {priceError && <p className="text-xs text-red-500 mt-1">{priceError}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
            <input
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className={inputCls}
              placeholder="Consultas"
              list="service-categories"
            />
            <datalist id="service-categories">
              {['Consultas', 'Procedimientos', 'Laboratorio', 'Imágenes', 'Cirugía'].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Orden</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => set('sort_order', Number(e.target.value))}
              className={inputCls}
              min={0}
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
                className="rounded"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span className="text-sm text-gray-700">Activo</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="submit" size="sm" isLoading={isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear servicio'}
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
      <div className="flex-1 space-y-1">
        <div className="h-3.5 bg-gray-200 rounded w-48" />
        <div className="h-3 bg-gray-100 rounded w-24" />
      </div>
      <div className="h-3.5 bg-gray-100 rounded w-16" />
      <div className="h-5 bg-gray-100 rounded w-12" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ServicesTab() {
  const { data: services = [], isLoading } = useAdminServices()
  const updateService = useUpdateService()
  const deleteService = useDeleteService()

  const [formTarget,    setFormTarget]    = useState<ServiceCatalogItem | null | undefined>(undefined)
  const [deleteTarget,  setDeleteTarget]  = useState<ServiceCatalogItem | null>(null)

  // Group by category for display
  const grouped = services.reduce<Record<string, ServiceCatalogItem[]>>((acc, s) => {
    const cat = s.category ?? 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {services.filter((s) => s.active).length} activo{services.filter((s) => s.active).length !== 1 ? 's' : ''}{' '}
          de {services.length} servicio{services.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={() => setFormTarget(null)}>
          <Plus size={14} className="mr-1.5" />
          Nuevo servicio
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-base overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-base flex flex-col items-center justify-center py-16 text-center">
          <Tag className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No hay servicios en el catálogo</p>
          <Button size="sm" className="mt-3" onClick={() => setFormTarget(null)}>
            Agregar primer servicio
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="bg-white border border-gray-200 rounded-base overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{category}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                    {/* Name + description */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${s.active ? 'text-gray-800' : 'text-gray-400'}`}>
                        {s.name}
                        {!s.active && <span className="ml-2 text-xs text-gray-400">(inactivo)</span>}
                      </p>
                      {s.description && (
                        <p className="text-xs text-gray-400 truncate">{s.description}</p>
                      )}
                    </div>

                    {/* Price */}
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                      {formatPrice(s.price)}
                    </span>

                    {/* Status toggle */}
                    <Badge variant={s.active ? 'success' : 'warning'}>
                      {s.active ? 'Activo' : 'Inactivo'}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateService.mutate({ id: s.id, data: { active: !s.active } })}
                        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${s.active ? 'text-gray-400 hover:text-orange-500' : 'text-gray-400 hover:text-green-600'}`}
                        title={s.active ? 'Desactivar' : 'Activar'}
                      >
                        {s.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>
                      <button
                        onClick={() => setFormTarget(s)}
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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit form */}
      {formTarget !== undefined && (
        <ServiceFormModal
          service={formTarget}
          onClose={() => setFormTarget(undefined)}
        />
      )}

      {/* Delete confirm */}
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
                isLoading={deleteService.isPending}
                onClick={() => {
                  deleteService.mutate(deleteTarget.id, {
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
