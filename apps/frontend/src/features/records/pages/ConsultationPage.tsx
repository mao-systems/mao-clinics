import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  RotateCcw,
  CheckCircle,
  Save,
  FilePlus,
  Paperclip,
  AlertTriangle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import {
  useRecordByAppointment,
  useCreateRecord,
  useUpdateRecord,
  useCompleteRecord,
} from '../hooks/useRecords'
import type { ConsultationAppointment } from '../hooks/useRecords'
import { ICD10Search } from '../components/ICD10Search'
import { PrescriptionForm } from '../components/PrescriptionForm'
import { PrescriptionCard } from '../components/PrescriptionCard'
import { AttachmentsPanel } from '../components/AttachmentsPanel'
import type { Consultation } from '../hooks/useRecords'
import type { ICD10Value } from '../components/ICD10Search'

// ── Tiptap toolbar ─────────────────────────────────────────────────────────────

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

  const toolbarBtn = (active: boolean) =>
    [
      'p-1 rounded transition-colors',
      active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100',
    ].join(' ')

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-wrap">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={toolbarBtn(editor.isActive('bold'))}
        title="Negrita"
      >
        <Bold size={13} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={toolbarBtn(editor.isActive('italic'))}
        title="Cursiva"
      >
        <Italic size={13} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={toolbarBtn(editor.isActive('underline'))}
        title="Subrayado"
      >
        <UnderlineIcon size={13} />
      </button>
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={toolbarBtn(editor.isActive('bulletList'))}
        title="Lista con viñetas"
      >
        <List size={13} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={toolbarBtn(editor.isActive('orderedList'))}
        title="Lista numerada"
      >
        <ListOrdered size={13} />
      </button>
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        className={toolbarBtn(false)}
        title="Limpiar formato"
      >
        <RotateCcw size={13} />
      </button>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, required, children }: {
  title:     string
  required?: boolean
  children:  React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {title}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), "d 'de' MMM yyyy, HH:mm", { locale: es })
  } catch {
    return '—'
  }
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const navigate          = useNavigate()
  const { user }          = useAuth()

  const canEdit =
    user?.role === 'admin' || user?.role === 'doctor'

  // ── Remote state ─────────────────────────────────────────────────────────────
  const {
    data:      record,
    isLoading: loadingRecord,
    refetch,
  } = useRecordByAppointment(appointmentId ?? '')

  // Always fetch the appointment directly so patient info is available
  // even when no consultation record has been created yet.
  const { data: appointment, isLoading: loadingAppt } = useQuery({
    queryKey: ['appointments', appointmentId],
    queryFn:  async () => {
      const res = await api.get<{ appointment: ConsultationAppointment }>(
        `/appointments/${appointmentId}`,
      )
      return res.appointment
    },
    enabled:   !!appointmentId,
    staleTime: 1000 * 60 * 5,
  })

  const createRecord   = useCreateRecord()
  const updateRecord   = useUpdateRecord()
  const completeRecord = useCompleteRecord()

  // ── Local form state ──────────────────────────────────────────────────────────
  const [chiefComplaint,  setChiefComplaint]  = useState('')
  const [icd10,           setIcd10]           = useState<ICD10Value | null>(null)
  const [diagnosisNotes,  setDiagnosisNotes]  = useState('')
  const [extraNotes,      setExtraNotes]      = useState('')
  const [followUpDate,    setFollowUpDate]    = useState('')
  const [isDirty,         setIsDirty]         = useState(false)
  const [lastAutoSave,    setLastAutoSave]    = useState<Date | null>(null)
  const [showPrescForm,   setShowPrescForm]   = useState(false)
  const [completing,      setCompleting]      = useState(false)

  const isCompleted =
    record?.appointment?.status === 'completed' ||
    record?.appointment?.status === 'cancelled'

  const isReadOnly = isCompleted || !canEdit

  // ── Tiptap editors ─────────────────────────────────────────────────────────
  const physicalExamEditor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Registra los hallazgos del examen físico...' }),
    ],
    editable: !isReadOnly,
    onUpdate: () => setIsDirty(true),
  })

  const treatmentEditor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Describe el plan de tratamiento...' }),
    ],
    editable: !isReadOnly,
    onUpdate: () => setIsDirty(true),
  })

  // Update editor editable state when isReadOnly changes
  useEffect(() => {
    physicalExamEditor?.setEditable(!isReadOnly)
    treatmentEditor?.setEditable(!isReadOnly)
  }, [isReadOnly, physicalExamEditor, treatmentEditor])

  // ── Populate form when record loads ──────────────────────────────────────────
  useEffect(() => {
    if (!record) return

    setChiefComplaint(record.chief_complaint ?? '')
    setIcd10(
      record.icd10_code
        ? { code: record.icd10_code, description: record.icd10_description ?? '' }
        : null,
    )
    setDiagnosisNotes(record.diagnosis ?? '')
    setExtraNotes(record.notes ?? '')
    setFollowUpDate(
      record.follow_up_date ? record.follow_up_date.slice(0, 10) : '',
    )

    if (physicalExamEditor && record.physical_exam) {
      physicalExamEditor.commands.setContent(record.physical_exam, { emitUpdate: false })
    }
    if (treatmentEditor && record.treatment) {
      treatmentEditor.commands.setContent(record.treatment, { emitUpdate: false })
    }

    setIsDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id])

  // ── Build payload from current form state ─────────────────────────────────
  const buildPayload = useCallback(
    (silent = false) => ({
      chief_complaint:   chiefComplaint.trim(),
      physical_exam:     physicalExamEditor?.getHTML() ?? '',
      diagnosis:         diagnosisNotes.trim() || undefined,
      icd10_code:        icd10?.code,
      icd10_description: icd10?.description,
      treatment:         treatmentEditor?.getHTML() ?? '',
      notes:             extraNotes.trim() || undefined,
      follow_up_date:    followUpDate
        ? new Date(followUpDate).toISOString()
        : undefined,
      silent,
    }),
    [chiefComplaint, physicalExamEditor, diagnosisNotes, icd10, treatmentEditor, extraNotes, followUpDate],
  )

  // ── Auto-save every 30 s ─────────────────────────────────────────────────────
  const isDirtyRef = useRef(isDirty)
  isDirtyRef.current = isDirty

  useEffect(() => {
    if (!record || isCompleted || !canEdit) return

    const intervalId = setInterval(() => {
      if (!isDirtyRef.current) return
      updateRecord.mutate(
        { id: record.id, data: buildPayload(true) },
        {
          onSuccess: () => {
            setLastAutoSave(new Date())
            setIsDirty(false)
          },
        },
      )
    }, 30_000)

    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, isCompleted, canEdit])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleCreate() {
    if (!appointmentId || !chiefComplaint.trim()) return
    createRecord.mutate(
      {
        appointment_id:  appointmentId,
        chief_complaint: chiefComplaint.trim(),
      },
      {
        onSuccess: () => {
          refetch()
          setIsDirty(false)
        },
      },
    )
  }

  function handleSave() {
    if (!record) return
    updateRecord.mutate(
      { id: record.id, data: buildPayload(false) },
      { onSuccess: () => setIsDirty(false) },
    )
  }

  async function handleComplete() {
    if (!record) return
    setCompleting(true)
    // Save first, then complete
    await new Promise<void>((resolve) => {
      updateRecord.mutate(
        { id: record.id, data: buildPayload(true) },
        {
          onSuccess: () => resolve(),
          onError:   () => resolve(), // still try to complete
        },
      )
    })
    completeRecord.mutate(record.id, {
      onSuccess: () => {
        setCompleting(false)
        navigate('/appointments')
      },
      onError: () => setCompleting(false),
    })
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (loadingRecord || loadingAppt) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  // Prefer data from the consultation record (includes the appointment relation),
  // fall back to the directly-fetched appointment when no record exists yet.
  const apptData = record?.appointment ?? appointment
  const patient  = apptData?.patient
  const doctor   = apptData?.doctor

  return (
    <div className="space-y-4">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/appointments')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
        >
          <ArrowLeft size={15} />
          Citas
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">
          {patient
            ? `${patient.last_name}, ${patient.first_name}`
            : 'Consulta'}
        </span>
        {apptData && (
          <span className="text-sm text-gray-400">
            — {formatShortDate(apptData.scheduled_at)}
          </span>
        )}
      </div>

      {/* Completed banner */}
      {isCompleted && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-base">
          <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
          <span className="text-sm text-emerald-700 font-medium">
            Consulta {record?.appointment?.status === 'completed' ? 'completada' : 'cancelada'}
            {record?.updated_at ? ` el ${formatShortDate(record.updated_at)}` : ''}
          </span>
        </div>
      )}

      {/* Three-column layout */}
      <div className="flex gap-4 items-start">

        {/* ── LEFT COLUMN: Patient summary ──────────────────────────────────── */}
        <aside className="w-56 flex-shrink-0 space-y-3">
          {patient ? (
            <>
              {/* Patient card */}
              <div className="bg-white rounded-base border border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {(patient.first_name[0] ?? '') + (patient.last_name[0] ?? '')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {patient.last_name}, {patient.first_name}
                    </p>
                    <p className="text-xs text-gray-400">DNI {patient.dni}</p>
                  </div>
                </div>

                {doctor && (
                  <div className="text-xs text-gray-500 border-t border-gray-100 pt-2 mt-2">
                    <p className="font-medium text-gray-700">
                      Dr. {doctor.user.first_name} {doctor.user.last_name}
                    </p>
                    <p>{doctor.specialty}</p>
                  </div>
                )}
              </div>

              {/* Prescriptions count + history link */}
              <div className="bg-white rounded-base border border-gray-200 p-3 space-y-1.5">
                {record?.prescriptions && record.prescriptions.length > 0 && (
                  <Badge variant="info" className="text-xs">
                    {record.prescriptions.length} receta{record.prescriptions.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                <Link
                  to={`/patients/${patient.id}`}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors"
                >
                  Ver historial completo →
                </Link>
              </div>
            </>
          ) : (
            /* No appointment yet (page opened directly) */
            <div className="bg-white rounded-base border border-gray-200 p-4">
              <p className="text-xs text-gray-400 text-center">
                Cargando información del paciente...
              </p>
            </div>
          )}
        </aside>

        {/* ── CENTER COLUMN: Editor ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Motivo de consulta */}
          <div className="bg-white rounded-base border border-gray-200 p-4">
            <Section title="Motivo de consulta" required>
              <textarea
                value={chiefComplaint}
                onChange={(e) => {
                  setChiefComplaint(e.target.value)
                  setIsDirty(true)
                }}
                disabled={isReadOnly}
                placeholder="Describe el motivo de la consulta..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 resize-none disabled:bg-gray-50 disabled:text-gray-500"
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              />
            </Section>
          </div>

          {/* Examen físico */}
          <div className="bg-white rounded-base border border-gray-200 overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Examen físico
              </label>
            </div>
            <EditorToolbar editor={physicalExamEditor} />
            <EditorContent
              editor={physicalExamEditor}
              className="px-4 py-3 min-h-[100px] text-sm prose prose-sm max-w-none focus-within:outline-none [&_.tiptap]:outline-none [&_.tiptap.ProseMirror-focused]:ring-0"
            />
          </div>

          {/* Diagnóstico */}
          <div className="bg-white rounded-base border border-gray-200 p-4 space-y-3">
            <Section title="Diagnóstico CIE-10">
              <ICD10Search
                value={icd10}
                onChange={(v) => { setIcd10(v); setIsDirty(true) }}
                disabled={isReadOnly}
              />
            </Section>
            <Section title="Notas de diagnóstico">
              <textarea
                value={diagnosisNotes}
                onChange={(e) => {
                  setDiagnosisNotes(e.target.value)
                  setIsDirty(true)
                }}
                disabled={isReadOnly}
                placeholder="Descripción del diagnóstico..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 resize-none disabled:bg-gray-50 disabled:text-gray-500"
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              />
            </Section>
          </div>

          {/* Tratamiento */}
          <div className="bg-white rounded-base border border-gray-200 overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Tratamiento y plan
              </label>
            </div>
            <EditorToolbar editor={treatmentEditor} />
            <EditorContent
              editor={treatmentEditor}
              className="px-4 py-3 min-h-[100px] text-sm prose prose-sm max-w-none [&_.tiptap]:outline-none [&_.tiptap.ProseMirror-focused]:ring-0"
            />
          </div>

          {/* Observaciones + Próxima cita */}
          <div className="bg-white rounded-base border border-gray-200 p-4 space-y-3">
            <Section title="Observaciones adicionales">
              <textarea
                value={extraNotes}
                onChange={(e) => {
                  setExtraNotes(e.target.value)
                  setIsDirty(true)
                }}
                disabled={isReadOnly}
                placeholder="Observaciones o notas adicionales..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 resize-none disabled:bg-gray-50 disabled:text-gray-500"
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              />
            </Section>
            <Section title="Próxima cita sugerida">
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => {
                  setFollowUpDate(e.target.value)
                  setIsDirty(true)
                }}
                disabled={isReadOnly}
                className="px-3 py-2 text-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500"
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              />
            </Section>
          </div>

          {/* Prescription form panel */}
          {showPrescForm && record && (
            <PrescriptionForm
              recordId={record.id}
              onClose={() => setShowPrescForm(false)}
            />
          )}

          {/* Action bar */}
          {canEdit && !isCompleted && (
            <div className="bg-white rounded-base border border-gray-200 px-4 py-3 flex items-center gap-2 flex-wrap">
              {!record ? (
                /* No record yet — Iniciar consulta */
                <Button
                  onClick={handleCreate}
                  disabled={!chiefComplaint.trim() || createRecord.isPending}
                  isLoading={createRecord.isPending}
                >
                  Iniciar consulta
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleSave}
                    disabled={!isDirty || updateRecord.isPending}
                    isLoading={updateRecord.isPending && !completing}
                  >
                    <Save size={13} className="mr-1.5" />
                    Guardar borrador
                  </Button>

                  {!showPrescForm && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowPrescForm(true)}
                    >
                      <FilePlus size={13} className="mr-1.5" />
                      Agregar receta
                    </Button>
                  )}

                  <Button
                    onClick={handleComplete}
                    disabled={completing || !chiefComplaint.trim()}
                    isLoading={completing}
                    className="ml-auto font-bold"
                  >
                    <CheckCircle size={13} className="mr-1.5" />
                    Completar consulta
                  </Button>
                </>
              )}

              {/* Auto-save indicator */}
              {lastAutoSave && (
                <span className="ml-auto text-xs text-gray-400">
                  Guardado automáticamente {format(lastAutoSave, 'HH:mm', { locale: es })}
                </span>
              )}
            </div>
          )}

          {/* No permissions notice */}
          {!canEdit && !isCompleted && (
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-base">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Solo médicos y administradores pueden editar consultas.
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Prescriptions + Attachments ─────────────────────── */}
        <aside className="w-64 flex-shrink-0 space-y-4">
          {/* Prescriptions */}
          <div className="bg-white rounded-base border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Recetas
              </h3>
              {canEdit && !isCompleted && !showPrescForm && record && (
                <button
                  type="button"
                  onClick={() => setShowPrescForm(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Nueva receta
                </button>
              )}
            </div>

            {record && record.prescriptions.length > 0 ? (
              <div className="space-y-2">
                {record.prescriptions.map((presc) => (
                  <PrescriptionCard
                    key={presc.id}
                    prescription={presc}
                    recordId={record.id}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">
                {record ? 'Sin recetas' : 'Inicia la consulta para agregar recetas'}
              </p>
            )}
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-base border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Paperclip size={12} className="text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Archivos adjuntos
              </h3>
            </div>

            {record ? (
              <AttachmentsPanel
                recordId={record.id}
                attachments={record.attachments ?? []}
              />
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">
                Inicia la consulta para adjuntar archivos
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
