import { useRef, useState } from 'react'
import { FileText, FileImage, File, ExternalLink, Upload, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useUploadAttachment } from '../hooks/useRecords'
import type { Attachment } from '../hooks/useRecords'

interface AttachmentsPanelProps {
  recordId:    string
  attachments: Attachment[]
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return <FileImage size={14} className="text-blue-400" />
  if (ext === 'pdf')
    return <FileText size={14} className="text-red-400" />
  return <File size={14} className="text-gray-400" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentsPanel({ recordId, attachments }: AttachmentsPanelProps) {
  const fileInputRef           = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const upload                 = useUploadAttachment()

  function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo supera el límite de 10 MB')
      return
    }
    upload.mutate({ recordId, file })
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so the same file can be re-uploaded
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-3">
      {/* Existing files */}
      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((att, idx) => {
            const uploaded = (() => {
              try {
                return format(parseISO(att.uploadedAt), 'dd MMM yyyy', { locale: es })
              } catch {
                return '—'
              }
            })()

            return (
              <li
                key={idx}
                className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-base"
              >
                {getFileIcon(att.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{att.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(att.size)} · {uploaded}
                  </p>
                </div>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary transition-colors"
                  aria-label="Ver archivo"
                >
                  <ExternalLink size={13} />
                </a>
              </li>
            )
          })}
        </ul>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={[
          'flex flex-col items-center justify-center gap-1.5 px-4 py-5 border-2 border-dashed rounded-base cursor-pointer transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400',
        ].join(' ')}
      >
        {upload.isPending ? (
          <Loader2 size={20} className="animate-spin text-primary" />
        ) : (
          <Upload size={16} className="text-gray-400" />
        )}
        <p className="text-xs text-gray-500 text-center">
          {upload.isPending
            ? 'Subiendo...'
            : 'Arrastra archivos aquí o haz clic'}
        </p>
        <p className="text-xs text-gray-400">PDF, imágenes — máx. 10 MB</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={handleInputChange}
      />
    </div>
  )
}
