import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

const LIMA_DISTRICTS = [
  'Todos los distritos',
  'Miraflores',
  'San Borja',
  'San Isidro',
  'Surco',
  'La Molina',
  'Magdalena',
  'Pueblo Libre',
  'Jesús María',
  'Lince',
  'San Miguel',
  'Barranco',
  'Chorrillos',
  'San Juan de Miraflores',
  'Villa El Salvador',
  'San Juan de Lurigancho',
  'Los Olivos',
  'Otros',
]

interface SearchFilters {
  q: string
  district: string
}

interface PatientSearchBarProps {
  onChange: (filters: SearchFilters) => void
}

export function PatientSearchBar({ onChange }: PatientSearchBarProps) {
  const [inputValue, setInputValue] = useState('')
  const [district, setDistrict] = useState('')
  const debouncedQuery = useDebounce(inputValue, 300)

  // Emit whenever debounced query or district changes
  useEffect(() => {
    onChange({ q: debouncedQuery, district })
  }, [debouncedQuery, district, onChange])

  return (
    <div className="flex items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1 max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Buscar por nombre o DNI..."
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {inputValue && (
          <button
            onClick={() => setInputValue('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* District filter */}
      <select
        value={district}
        onChange={(e) => setDistrict(e.target.value === 'Todos los distritos' ? '' : e.target.value)}
        className="py-2 pl-3 pr-8 text-sm border border-gray-300 rounded-base bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-700"
      >
        {LIMA_DISTRICTS.map((d) => (
          <option key={d} value={d === 'Todos los distritos' ? '' : d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  )
}
