import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  useCreateService,
  useUpdateService,
  type ServiceItem,
  type CreateServiceData,
  type UpdateServiceData,
} from '../hooks/useAdminServices'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Consultas', 'Procedimientos', 'Laboratorio', 'Imágenes', 'Cirugías', 'Otros']

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  service?: ServiceItem
  onClose:  () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ServiceForm({ service, onClose }: Props) {
  const isEdit = !!service

  const [form, setForm] = useState({
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
  const isPending      = createMutation.isPending || updateMutation.isPending

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function validatePrice(v: string): boolean {
    if (/^\d+(\.\d{1,2})?$/.test(v.trim())) {
      setPriceError('')
      return true
    }
    setPriceError('Ingresa un precio válido (ej. 50 o 50.00)')
    return false
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validatePrice(form.price)) return

    // Normalize price to 2 decimal places string
    const price = parseFloat(form.price).toFixed(2)

    if (isEdit && service) {
      const data: UpdateServiceData = {
        name:        form.name,
        description: form.description || null,
        price,
        category:    form.category || null,
        active:      form.active,
        sort_order:  form.sort_order,
      }
      updateMutation.mutate({ id: service.id, data }, { onSuccess: onClose })
    } else {
      const data: CreateServiceData = {
        name:        form.name,
        description: form.description || null,
        price,
        category:    form.category || null,
        active:      form.active,
        sort_order:  form.sort_order,
      }
      createMutation.mutate(data, { onSuccess: onClose })
    }
  }

  const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar servicio' : 'Nuevo servicio'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Nombre del servicio <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className={inp}
            placeholder="Consulta médica general"
            maxLength={200}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
          <input
            list="svc-categories"
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className={inp}
            placeholder="Selecciona o escribe una categoría"
          />
          <datalist id="svc-categories">
            {CATEGORIES.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Precio (S/) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">S/</span>
            <input
              required
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={e => {
                set('price', e.target.value)
                if (priceError) validatePrice(e.target.value)
              }}
              onBlur={() => form.price && validatePrice(form.price)}
              className={`${inp} pl-9 ${priceError ? 'border-red-400' : ''}`}
              placeholder="50.00"
            />
          </div>
          {priceError && <p className="text-xs text-red-500 mt-1">{priceError}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={2}
            className={`${inp} resize-none`}
            placeholder="Descripción breve del servicio…"
            maxLength={500}
          />
        </div>

        {/* Sort order + active */}
        <div className="flex items-center gap-4">
          <div className="w-24">
            <label className="block text-xs font-medium text-gray-700 mb-1">Orden</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={e => set('sort_order', Number(e.target.value))}
              min={0}
              className={inp}
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
            {/* Toggle switch */}
            <button
              type="button"
              onClick={() => set('active', !form.active)}
              className={[
                'relative w-9 h-5 rounded-full transition-colors focus:outline-none',
                form.active ? 'bg-primary' : 'bg-gray-300',
              ].join(' ')}
              style={form.active ? { backgroundColor: 'var(--color-primary)' } : {}}
              aria-label={form.active ? 'Desactivar servicio' : 'Activar servicio'}
            >
              <span className={[
                'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                form.active ? 'translate-x-4' : 'translate-x-0',
              ].join(' ')} />
            </button>
            <span className="text-sm text-gray-700">
              {form.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" isLoading={isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear servicio'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
