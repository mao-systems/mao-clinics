import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type VisibilityState,
} from '@tanstack/react-table'
import { Eye, Pencil, Trash2, Users, Columns3, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Patient } from '@mao-systems/shared'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import {
  formatAge,
  formatDNI,
  formatPhone,
  getSexIcon,
  getPatientInitials,
} from '../utils/patient.utils'

interface PaginationState {
  page: number
  setPage: (p: number) => void
  limit: number
  setLimit: (l: number) => void
  total: number
  totalPages: number
}

interface PatientTableProps {
  patients: Patient[]
  isLoading: boolean
  isFetching: boolean
  pagination: PaginationState
  onNew: () => void
  onEdit: (patient: Patient) => void
  onDelete: (id: string) => void
  isAdmin: boolean
}

const columnHelper = createColumnHelper<Patient>()

// ── Loading skeleton ──────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Users className="w-12 h-12 text-gray-300 mb-4" />
      <p className="text-gray-600 font-medium">No se encontraron pacientes</p>
      <p className="text-gray-400 text-sm mt-1">Registra el primer paciente para comenzar</p>
      <Button size="sm" className="mt-4" onClick={onNew}>
        Registrar primero
      </Button>
    </div>
  )
}

// ── Column labels for the visibility menu ────────────────────────────────────
const COLUMN_LABELS: Record<string, string> = {
  patient_info: 'Paciente',
  age_sex: 'Edad / Sexo',
  phone: 'Teléfono',
  district: 'Distrito',
  registered: 'Registrado',
  actions: 'Acciones',
}

export function PatientTable({
  patients,
  isLoading,
  isFetching,
  pagination,
  onNew,
  onEdit,
  onDelete,
  isAdmin,
}: PatientTableProps) {
  const navigate = useNavigate()
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [showColumnsMenu, setShowColumnsMenu] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const columns = useMemo(
    () => [
      // 1. Paciente: avatar + name + DNI
      columnHelper.display({
        id: 'patient_info',
        header: 'Paciente',
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {getPatientInitials(p)}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {p.first_name} {p.last_name}
                </p>
                <p className="text-xs text-gray-400">{formatDNI(p.dni)}</p>
              </div>
            </div>
          )
        },
      }),

      // 2. Edad / Sexo
      columnHelper.display({
        id: 'age_sex',
        header: 'Edad / Sexo',
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="text-sm text-gray-700">
              <span>{formatAge(p.date_of_birth)}</span>
              {p.sex && (
                <span className="ml-1.5 text-gray-400">{getSexIcon(p.sex)}</span>
              )}
            </div>
          )
        },
      }),

      // 3. Teléfono
      columnHelper.accessor('phone', {
        header: 'Teléfono',
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-600">{formatPhone(getValue())}</span>
        ),
      }),

      // 4. Distrito
      columnHelper.accessor('district', {
        header: 'Distrito',
        cell: ({ getValue }) => {
          const d = getValue()
          return d ? (
            <Badge variant="default">{d}</Badge>
          ) : (
            <span className="text-gray-400 text-sm">—</span>
          )
        },
      }),

      // 5. Registrado (relative time)
      columnHelper.accessor('created_at', {
        id: 'registered',
        header: 'Registrado',
        cell: ({ getValue }) => {
          try {
            return (
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(parseISO(getValue()), { addSuffix: true, locale: es })}
              </span>
            )
          } catch {
            return <span className="text-gray-400">—</span>
          }
        },
      }),

      // 6. Acciones
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => navigate(`/patients/${p.id}`)}
                className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-gray-100 transition-colors"
                title="Ver perfil"
              >
                <Eye size={15} />
              </button>
              <button
                onClick={() => onEdit(p)}
                className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-gray-100 transition-colors"
                title="Editar"
              >
                <Pencil size={15} />
              </button>
              {isAdmin && (
                <button
                  onClick={() => setConfirmDeleteId(p.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )
        },
      }),
    ],
    [navigate, onEdit, isAdmin],
  )

  const table = useReactTable({
    data: patients,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  })

  const { page, setPage, limit, setLimit, total, totalPages } = pagination
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  if (isLoading) return <TableSkeleton />

  return (
    <div className="bg-white rounded-base border border-gray-200 overflow-hidden">
      {/* Toolbar: column visibility */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm text-gray-500">
          {isFetching && !isLoading ? (
            <span className="text-primary">Actualizando...</span>
          ) : (
            <>{total} paciente{total !== 1 ? 's' : ''}</>
          )}
        </p>

        <div className="relative">
          <button
            onClick={() => setShowColumnsMenu((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-base hover:bg-gray-50 transition-colors"
          >
            <Columns3 size={13} />
            Columnas
          </button>

          {showColumnsMenu && (
            <>
              {/* Backdrop to close on click-outside */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowColumnsMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-base shadow-lg py-1 min-w-[160px]">
                {table.getAllLeafColumns()
                  .filter((col) => col.id !== 'actions')
                  .map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                        className="accent-primary"
                      />
                      {COLUMN_LABELS[col.id] ?? col.id}
                    </label>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      {patients.length === 0 ? (
        <EmptyState onNew={onNew} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/patients/${row.original.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination footer */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Filas por página:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="border border-gray-200 rounded text-xs px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>
              {start}–{end} de {total}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600 px-2">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Eliminar paciente"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-6">
          ¿Estás seguro de que deseas eliminar este paciente? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDeleteId) onDelete(confirmDeleteId)
              setConfirmDeleteId(null)
            }}
          >
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
