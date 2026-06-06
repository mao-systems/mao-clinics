import { useState } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Search, Loader2 } from 'lucide-react'
import type { Patient } from '@mao-systems/shared'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useDebounce } from '@/hooks/useDebounce'
import { usePatients } from '@/features/patients/hooks/usePatients'
import { useCreateInvoice } from '../hooks/useBilling'
import { calculateTotals, formatCurrency } from '../utils/billing.utils'

// ── Zod schema ────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  description: z.string().min(1, 'Descripción requerida').max(200),
  quantity:    z.coerce.number().int().min(1, 'Mín. 1').max(99),
  unit_price:  z
    .string()
    .min(1, 'Precio requerido')
    .regex(/^\d+(\.\d{1,2})?$/, 'Precio inválido (ej: 80.00)'),
})

const formSchema = z.object({
  type:             z.enum(['boleta', 'factura']),
  items:            z.array(itemSchema).min(1, 'Agrega al menos un concepto'),
  customer_ruc:     z.string().regex(/^\d{11}$/, 'RUC de 11 dígitos').optional().or(z.literal('')),
  customer_name:    z.string().max(200).optional(),
  customer_address: z.string().max(300).optional(),
})

type FormValues = z.infer<typeof formSchema>

// ── Quick-add service chips ───────────────────────────────────────────────────

const QUICK_SERVICES = [
  { label: 'Consulta médica',    price: '80.00'  },
  { label: 'Consulta especialista', price: '120.00' },
  { label: 'Radiografía',        price: '45.00'  },
  { label: 'Análisis de sangre', price: '35.00'  },
  { label: 'Ecografía',          price: '60.00'  },
  { label: 'Electrocardiograma', price: '40.00'  },
]

// ── Patient mini-type ─────────────────────────────────────────────────────────

interface PatientSummary {
  id:         string
  first_name: string
  last_name:  string
  dni:        string
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface InvoiceFormProps {
  patientId?:       string
  patientName?:     string   // display name when pre-selected
  patientDni?:      string   // display DNI when pre-selected
  consultationId?:  string | null
  onClose:          () => void
}

// ── Totals panel ──────────────────────────────────────────────────────────────

function TotalsPanel({ items }: { items: FormValues['items'] }) {
  const totals = calculateTotals(items)
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-base p-4 space-y-1.5">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Subtotal:</span>
        <span className="font-medium text-gray-800">{formatCurrency(totals.subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm text-gray-600">
        <span>IGV (18%):</span>
        <span className="font-medium text-gray-800">{formatCurrency(totals.tax)}</span>
      </div>
      <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between">
        <span className="text-base font-bold text-gray-800">Total:</span>
        <span
          className="text-xl font-bold"
          style={{ color: 'var(--color-primary)' }}
        >
          {formatCurrency(totals.total)}
        </span>
      </div>
    </div>
  )
}

// ── Patient search inline ─────────────────────────────────────────────────────

function PatientSearchField({
  selected,
  onSelect,
}: {
  selected: PatientSummary | null
  onSelect: (p: PatientSummary | null) => void
}) {
  const [q,           setQ]           = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const debouncedQ    = useDebounce(q, 350)

  const { data, isFetching } = usePatients(
    debouncedQ.length >= 2 ? { q: debouncedQ, limit: 8 } : {},
  )
  const results = debouncedQ.length >= 2 ? (data?.data ?? []) : []

  if (selected) {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-base">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {selected.first_name[0]}{selected.last_name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {selected.first_name} {selected.last_name}
          </p>
          <p className="text-xs text-gray-500">DNI {selected.dni}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-gray-400 hover:text-gray-600 ml-2"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Buscar por nombre o DNI..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
        />
        {isFetching && (
          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-base shadow-lg max-h-48 overflow-y-auto">
            {results.map((p: Patient) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect({ id: p.id, first_name: p.first_name, last_name: p.last_name, dni: p.dni })
                  setQ('')
                  setShowDropdown(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {p.first_name[0]}{p.last_name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {p.first_name} {p.last_name}
                  </p>
                  <p className="text-xs text-gray-400">DNI {p.dni}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {showDropdown && debouncedQ.length >= 2 && results.length === 0 && !isFetching && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-base shadow p-3 text-sm text-gray-500 text-center">
          Sin resultados para "{debouncedQ}"
        </div>
      )}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function InvoiceForm({
  patientId,
  patientName,
  patientDni,
  consultationId,
  onClose,
}: InvoiceFormProps) {
  const createMutation = useCreateInvoice()

  // Patient state — pre-selected or searched
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(
    patientId && patientName && patientDni
      ? { id: patientId, first_name: patientName.split(' ')[0] ?? '', last_name: patientName.split(' ').slice(1).join(' '), dni: patientDni }
      : null,
  )
  const [patientError, setPatientError] = useState('')

  // Default items: pre-fill "Consulta médica" if consultationId provided
  const defaultItems = consultationId
    ? [{ description: 'Consulta médica', quantity: 1, unit_price: '80.00' }]
    : [{ description: '', quantity: 1, unit_price: '' }]

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver:      zodResolver(formSchema),
    defaultValues: {
      type:  'boleta',
      items: defaultItems,
    },
  })

  const { fields, append, remove, update } = useFieldArray({ control, name: 'items' })
  const watchedType  = watch('type')
  const watchedItems = useWatch({ control, name: 'items' })

  function addQuickService(label: string, price: string) {
    // If the only row is the empty placeholder, replace it instead of appending
    const isOnlyPlaceholder =
      fields.length === 1 &&
      !watchedItems?.[0]?.description &&
      !watchedItems?.[0]?.unit_price
    if (isOnlyPlaceholder) {
      update(0, { description: label, quantity: 1, unit_price: price })
    } else {
      append({ description: label, quantity: 1, unit_price: price })
    }
  }

  async function onSubmit(values: FormValues) {
    if (!selectedPatient) {
      setPatientError('Selecciona un paciente')
      return
    }
    setPatientError('')

    await createMutation.mutateAsync({
      patient_id:       selectedPatient.id,
      consultation_id:  consultationId ?? null,
      type:             values.type,
      items:            values.items.map((i) => ({
        description: i.description,
        quantity:    Number(i.quantity),
        unit_price:  i.unit_price,
      })),
      customer_ruc:     values.customer_ruc     || undefined,
      customer_name:    values.customer_name    || undefined,
      customer_address: values.customer_address || undefined,
    })

    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title="Emitir comprobante" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Tipo de comprobante ─────────────────────────────────────────────── */}
        <fieldset>
          <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Tipo de comprobante
          </legend>
          <div className="flex gap-4">
            {(['boleta', 'factura'] as const).map((t) => (
              <label
                key={t}
                className={[
                  'flex items-center gap-2 px-4 py-2.5 border rounded-base cursor-pointer transition-colors text-sm',
                  watchedType === t
                    ? 'border-primary bg-blue-50 text-primary font-medium'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                <input
                  type="radio"
                  value={t}
                  {...register('type')}
                  className="accent-primary"
                />
                {t === 'boleta' ? 'Boleta de Venta' : 'Factura'}
              </label>
            ))}
          </div>

          {/* Factura extra fields */}
          {watchedType === 'factura' && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-base">
              <Input
                label="RUC del cliente (11 dígitos)"
                placeholder="20123456789"
                error={errors.customer_ruc?.message}
                {...register('customer_ruc')}
              />
              <Input
                label="Razón social"
                placeholder="Empresa S.A.C."
                error={errors.customer_name?.message}
                {...register('customer_name')}
              />
              <div className="col-span-2">
                <Input
                  label="Dirección fiscal"
                  placeholder="Av. Principal 123, Lima"
                  error={errors.customer_address?.message}
                  {...register('customer_address')}
                />
              </div>
            </div>
          )}
        </fieldset>

        {/* ── Paciente ────────────────────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Paciente
          </label>
          <PatientSearchField
            selected={selectedPatient}
            onSelect={(p) => { setSelectedPatient(p); setPatientError('') }}
          />
          {patientError && (
            <p className="text-xs text-red-500 mt-1">{patientError}</p>
          )}
        </div>

        {/* ── Servicios / Conceptos ───────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Servicios / Conceptos
          </label>

          {/* Quick-add chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_SERVICES.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => addQuickService(s.label, s.price)}
                className="text-xs px-2.5 py-1 border border-gray-200 rounded-full text-gray-600 hover:border-primary hover:text-primary hover:bg-blue-50 transition-colors"
              >
                + {s.label} S/{s.price}
              </button>
            ))}
          </div>

          {/* Items list */}
          <div className="space-y-2">
            {/* Items table — horizontally scrollable on mobile */}
          <div className="overflow-x-auto">
            {/* Header row */}
            <div className="grid grid-cols-[minmax(140px,1fr)_64px_100px_80px_28px] gap-2 px-1 min-w-[420px]">
              <span className="text-xs text-gray-400">Descripción</span>
              <span className="text-xs text-gray-400 text-center">Cant.</span>
              <span className="text-xs text-gray-400 text-right">P. Unit. (S/)</span>
              <span className="text-xs text-gray-400 text-right">Total</span>
              <span />
            </div>

            {fields.map((field, idx) => {
              const qty   = Number(watchedItems?.[idx]?.quantity ?? 1)
              const price = parseFloat(watchedItems?.[idx]?.unit_price ?? '0') || 0
              const lineTotal = isNaN(qty) ? 0 : price * qty

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-[minmax(140px,1fr)_64px_100px_80px_28px] gap-2 items-start min-w-[420px]"
                >
                  {/* Description */}
                  <div>
                    <input
                      {...register(`items.${idx}.description`)}
                      placeholder="Concepto..."
                      className={[
                        'w-full px-2.5 py-1.5 text-sm border rounded-base focus:outline-none focus:ring-1',
                        errors.items?.[idx]?.description
                          ? 'border-red-400'
                          : 'border-gray-300',
                      ].join(' ')}
                      style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                    />
                    {errors.items?.[idx]?.description && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {errors.items[idx].description?.message}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <input
                      {...register(`items.${idx}.quantity`)}
                      type="number"
                      min={1}
                      max={99}
                      className={[
                        'w-full px-2 py-1.5 text-sm border rounded-base text-center focus:outline-none focus:ring-1',
                        errors.items?.[idx]?.quantity
                          ? 'border-red-400'
                          : 'border-gray-300',
                      ].join(' ')}
                      style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                    />
                  </div>

                  {/* Unit price */}
                  <div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">S/</span>
                      <input
                        {...register(`items.${idx}.unit_price`)}
                        placeholder="0.00"
                        className={[
                          'w-full pl-7 pr-2 py-1.5 text-sm border rounded-base text-right focus:outline-none focus:ring-1',
                          errors.items?.[idx]?.unit_price
                            ? 'border-red-400'
                            : 'border-gray-300',
                        ].join(' ')}
                        style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                      />
                    </div>
                    {errors.items?.[idx]?.unit_price && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {errors.items[idx].unit_price?.message}
                      </p>
                    )}
                  </div>

                  {/* Line total (read-only) */}
                  <div className="py-1.5 text-sm text-gray-700 text-right font-medium">
                    S/ {lineTotal.toFixed(2)}
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    disabled={fields.length === 1}
                    className="mt-1.5 p-1 text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>

          </div>{/* end overflow-x-auto */}

          {errors.items?.root && (
            <p className="text-xs text-red-500 mt-1">{errors.items.root.message}</p>
          )}

          <button
            type="button"
            onClick={() => append({ description: '', quantity: 1, unit_price: '' })}
            className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Plus size={13} />
            Agregar concepto
          </button>
        </div>

        {/* ── Resumen ─────────────────────────────────────────────────────────── */}
        <TotalsPanel items={watchedItems ?? []} />

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={createMutation.isPending}
            disabled={createMutation.isPending}
          >
            Emitir comprobante
          </Button>
        </div>
      </form>
    </Modal>
  )
}
