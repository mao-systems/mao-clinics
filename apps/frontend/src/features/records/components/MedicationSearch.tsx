import { useRef, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { MEDICATIONS } from '../data/medications-peru'
import { Button } from '@/components/ui/Button'
import { useClickOutside } from '@/hooks/useClickOutside'

export interface PrescriptionItemInput {
  medication:    string
  dosage:        string
  frequency:     string
  duration_days: number
  notes?:        string
}

interface MedicationSearchProps {
  onAdd: (item: PrescriptionItemInput) => void
}

const EMPTY_FORM: PrescriptionItemInput & { notes: string } = {
  medication:    '',
  dosage:        '',
  frequency:     '',
  duration_days: 7,
  notes:         '',
}

export function MedicationSearch({ onAdd }: MedicationSearchProps) {
  const [query,     setQuery]     = useState('')
  const [open,      setOpen]      = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const containerRef              = useRef<HTMLDivElement>(null)

  const closeDropdown = useCallback(() => setOpen(false), [])
  useClickOutside(containerRef, closeDropdown)

  const filtered =
    query.length >= 1
      ? MEDICATIONS.filter((m) =>
          m.name.toLowerCase().includes(query.toLowerCase()),
        ).slice(0, 7)
      : []

  function handleSelect(med: (typeof MEDICATIONS)[number]) {
    setForm({
      medication:    med.name,
      dosage:        med.defaultDosage,
      frequency:     med.defaultFrequency,
      duration_days: med.defaultDays,
      notes:         '',
    })
    setQuery(med.name)
    setOpen(false)
  }

  function handleAdd() {
    if (!form.medication.trim() || !form.dosage.trim() || !form.frequency.trim()) return
    onAdd({
      medication:    form.medication.trim(),
      dosage:        form.dosage.trim(),
      frequency:     form.frequency.trim(),
      duration_days: form.duration_days,
      notes:         form.notes.trim() || undefined,
    })
    setForm(EMPTY_FORM)
    setQuery('')
  }

  const canAdd =
    form.medication.trim() &&
    form.dosage.trim() &&
    form.frequency.trim() &&
    form.duration_days > 0

  return (
    <div className="space-y-3">
      {/* Search */}
      <div ref={containerRef} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setForm((p) => ({ ...p, medication: e.target.value }))
            setOpen(true)
          }}
          onFocus={() => query && setOpen(true)}
          placeholder="Buscar o escribir medicamento..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-30 top-full mt-1 w-full bg-white border border-gray-200 rounded-base shadow-lg max-h-48 overflow-y-auto">
            {filtered.map((med) => (
              <button
                key={med.name}
                type="button"
                onClick={() => handleSelect(med)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex flex-col"
              >
                <span className="text-sm font-medium text-gray-800">{med.name}</span>
                <span className="text-xs text-gray-400">
                  {med.defaultDosage} · {med.defaultFrequency}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pre-fill form (shows when a medication name is typed/selected) */}
      {form.medication && (
        <div className="p-3 border border-gray-200 rounded-base bg-gray-50 space-y-2">
          <input
            type="text"
            value={form.medication}
            onChange={(e) => {
              setForm((p) => ({ ...p, medication: e.target.value }))
              setQuery(e.target.value)
            }}
            placeholder="Nombre del medicamento"
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={form.dosage}
              onChange={(e) => setForm((p) => ({ ...p, dosage: e.target.value }))}
              placeholder="Dosis (ej: 500mg)"
              className="px-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              value={form.frequency}
              onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))}
              placeholder="Frecuencia"
              className="px-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-0.5">Duración (días)</label>
              <input
                type="number"
                min={1}
                value={form.duration_days}
                onChange={(e) =>
                  setForm((p) => ({ ...p, duration_days: Math.max(1, parseInt(e.target.value) || 1) }))
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-0.5">Observaciones</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Opcional"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={!canAdd}
            className="w-full"
          >
            <Plus size={13} className="mr-1.5" />
            Agregar medicamento
          </Button>
        </div>
      )}
    </div>
  )
}
