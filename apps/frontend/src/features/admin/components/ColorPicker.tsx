import { useEffect, useState } from 'react'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (hex: string) => void
  description?: string
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value)

  // Keep text input in sync when value changes externally (e.g. palette selection)
  useEffect(() => {
    setInputValue(value)
  }, [value])

  function handleColorInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value
    setInputValue(hex)
    onChange(hex)
  }

  function handleTextInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setInputValue(raw)
    // Only propagate when the user has typed a complete valid hex color
    if (HEX_RE.test(raw)) {
      onChange(raw)
    }
  }

  function handleTextBlur() {
    // If the user left an invalid value, revert the text to the last valid color
    if (!HEX_RE.test(inputValue)) {
      setInputValue(value)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {description && (
        <p className="text-xs text-gray-500 mb-2 leading-snug">{description}</p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={handleColorInputChange}
          className="w-10 h-10 rounded cursor-pointer border border-gray-300 p-0.5 bg-white"
          title={label}
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleTextInputChange}
          onBlur={handleTextBlur}
          maxLength={7}
          placeholder="#000000"
          className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        {/* Preview swatch */}
        <div
          className="w-8 h-8 rounded border border-gray-200 flex-shrink-0"
          style={{ backgroundColor: HEX_RE.test(inputValue) ? inputValue : value }}
          title="Vista previa"
        />
      </div>
    </div>
  )
}
