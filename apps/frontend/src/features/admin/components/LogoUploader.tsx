import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useLogoUpload } from '../hooks/useLogoUpload'

interface LogoUploaderProps {
  currentLogoUrl: string | null
  tenantName: string
}

export function LogoUploader({ currentLogoUrl, tenantName }: LogoUploaderProps) {
  const { uploadLogo, deleteLogo, isUploading } = useLogoUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadLogo.mutate(file)
    // Reset so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex items-start gap-6">
      {/* Logo preview */}
      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
        {isUploading ? (
          <Spinner size="sm" />
        ) : currentLogoUrl ? (
          <img
            src={currentLogoUrl}
            alt={tenantName}
            className="max-w-full max-h-full object-contain p-1"
          />
        ) : (
          <span className="text-xs text-gray-400 text-center px-2 leading-tight">
            Sin logo
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex-1 space-y-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          isLoading={isUploading}
          disabled={isUploading}
        >
          {isUploading ? 'Subiendo...' : 'Subir logo'}
        </Button>

        {currentLogoUrl && !isUploading && (
          <div>
            <button
              type="button"
              onClick={() => deleteLogo.mutate()}
              disabled={deleteLogo.isPending}
              className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {deleteLogo.isPending ? 'Eliminando...' : 'Eliminar logo'}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-400 leading-snug">
          PNG, SVG o JPG · Máximo 2MB · Fondo transparente recomendado
        </p>
      </div>
    </div>
  )
}
