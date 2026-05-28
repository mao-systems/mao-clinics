import { useState } from 'react'
import { X, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useCreatePrescription } from '../hooks/useRecords'
import { MedicationSearch } from './MedicationSearch'
import type { PrescriptionItemInput } from './MedicationSearch'

interface PrescriptionFormProps {
  recordId: string
  onClose:  () => void
}

export function PrescriptionForm({ recordId, onClose }: PrescriptionFormProps) {
  const [instructions, setInstructions] = useState('')
  const [items,        setItems]        = useState<PrescriptionItemInput[]>([])

  const createPrescription = useCreatePrescription()

  function addItem(item: PrescriptionItemInput) {
    setItems((prev) => [...prev, item])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    if (items.length === 0) return
    createPrescription.mutate(
      {
        recordId,
        data: {
          instructions: instructions.trim() || undefined,
          items: items.map((i) => ({
            medication:    i.medication,
            dosage:        i.dosage,
            frequency:     i.frequency,
            duration_days: i.duration_days,
            notes:         i.notes,
          })),
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="border border-gray-200 rounded-base bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-base">
        <h3 className="text-sm font-semibold text-gray-800">Nueva Receta</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Instructions */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Indicaciones generales
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Indicaciones generales para el paciente..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 resize-none"
            style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          />
        </div>

        {/* Medication search */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Agregar medicamento
          </label>
          <MedicationSearch onAdd={addItem} />
        </div>

        {/* Added items list */}
        {items.length > 0 ? (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Medicamentos ({items.length})
            </label>
            <ul className="space-y-2">
              {items.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start justify-between gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-base"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{item.medication}</p>
                    <p className="text-xs text-gray-500">
                      {item.dosage} · {item.frequency} · {item.duration_days} día{item.duration_days !== 1 ? 's' : ''}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-base">
            <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">Agrega al menos un medicamento</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-base">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={items.length === 0 || createPrescription.isPending}
          isLoading={createPrescription.isPending}
        >
          Crear receta y generar PDF
        </Button>
      </div>
    </div>
  )
}
