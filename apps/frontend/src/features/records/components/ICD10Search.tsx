import { useRef, useState, useCallback } from 'react'
import { X, Search } from 'lucide-react'
import { ICD10_CODES } from '../data/icd10-common'
import { useClickOutside } from '@/hooks/useClickOutside'

export interface ICD10Value {
  code:        string
  description: string
}

interface ICD10SearchProps {
  value:     ICD10Value | null
  onChange:  (value: ICD10Value | null) => void
  disabled?: boolean
}

export function ICD10Search({ value, onChange, disabled }: ICD10SearchProps) {
  const [query,       setQuery]       = useState('')
  const [open,        setOpen]        = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const closeDropdown = useCallback(() => setOpen(false), [])
  useClickOutside(containerRef, closeDropdown)

  const filtered =
    query.length >= 1
      ? ICD10_CODES.filter(
          (c) =>
            c.code.toLowerCase().includes(query.toLowerCase()) ||
            c.description.toLowerCase().includes(query.toLowerCase()),
        ).slice(0, 8)
      : []

  function handleSelect(item: ICD10Value) {
    onChange(item)
    setQuery('')
    setOpen(false)
    setHighlighted(-1)
  }

  function handleClear() {
    onChange(null)
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      const item = filtered[highlighted]
      if (item) handleSelect(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        /* Selected state */
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-base bg-blue-50">
          <span className="font-mono text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded flex-shrink-0">
            {value.code}
          </span>
          <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">
            {value.description}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Quitar diagnóstico"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        /* Search state */
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              setHighlighted(-1)
            }}
            onFocus={() => query && setOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Buscar por código CIE-10 o descripción..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          />
        </div>
      )}

      {/* Dropdown */}
      {open && query.length >= 1 && (
        <div className="absolute z-30 top-full mt-1 w-full bg-white border border-gray-200 rounded-base shadow-lg overflow-hidden">
          {filtered.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto">
              {filtered.map((item, idx) => (
                <li key={item.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={[
                      'w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                      idx === highlighted ? 'bg-blue-50' : 'hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span className="font-mono text-xs font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                      {item.code}
                    </span>
                    <span className="text-sm text-gray-700 leading-snug">{item.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-gray-400 text-center">
              Sin resultados para "{query}"
            </p>
          )}
        </div>
      )}
    </div>
  )
}
