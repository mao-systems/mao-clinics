import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { authenticateJWT } from '@/middleware/authenticate'
import { setTenantMiddleware } from '@/middleware/setTenant'
import { roleGuard } from '@/middleware/roleGuard'
import {
  CreateConsultationSchema,
  UpdateConsultationSchema,
  CreatePrescriptionSchema,
  RecordsQuerySchema,
} from './records.schema'
import { recordsService } from './records.service'

// Store files in memory so the storage provider receives a Buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

const router = Router()

// All records routes require a valid JWT and a resolved tenant
router.use(authenticateJWT, setTenantMiddleware)

// GET /api/v1/records
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query  = RecordsQuerySchema.parse(req.query)
    const result = await recordsService.findAll(req.tenantId, query)
    res.status(200).json({ success: true, data: result.data, meta: result.meta })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/records/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id           = String(req.params['id'])
    const consultation = await recordsService.findById(req.tenantId, id)
    res.status(200).json({ success: true, data: { consultation } })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/records
router.post(
  '/',
  roleGuard(['admin', 'doctor', 'receptionist']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body         = CreateConsultationSchema.parse(req.body)
      const consultation = await recordsService.create(req.tenantId, body)
      res.status(201).json({ success: true, data: { consultation } })
    } catch (err) {
      next(err)
    }
  },
)

// PUT /api/v1/records/:id
router.put(
  '/:id',
  roleGuard(['admin', 'doctor']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id           = String(req.params['id'])
      const body         = UpdateConsultationSchema.parse(req.body)
      const consultation = await recordsService.update(req.tenantId, id, body)
      res.status(200).json({ success: true, data: { consultation } })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/records/:id/complete
// Marks the parent appointment as completed — doctor or admin only
router.post(
  '/:id/complete',
  roleGuard(['admin', 'doctor']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id           = String(req.params['id'])
      const consultation = await recordsService.complete(req.tenantId, id)
      res.status(200).json({ success: true, data: { consultation } })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/records/:id/prescriptions
router.post(
  '/:id/prescriptions',
  roleGuard(['admin', 'doctor']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id           = String(req.params['id'])
      const body         = CreatePrescriptionSchema.parse(req.body)
      const prescription = await recordsService.createPrescription(req.tenantId, id, body)
      res.status(201).json({ success: true, data: { prescription } })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/records/:id/prescriptions/:prescriptionId/pdf
// Streams the PDF buffer directly — no JSON envelope
router.get(
  '/:id/prescriptions/:prescriptionId/pdf',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id             = String(req.params['id'])
      const prescriptionId = String(req.params['prescriptionId'])
      const pdfBuffer      = await recordsService.getPrescriptionPdf(
        req.tenantId,
        id,
        prescriptionId,
      )

      res.setHeader('Content-Type',        'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="receta_${prescriptionId.slice(-8)}.pdf"`)
      res.setHeader('Content-Length',      pdfBuffer.length.toString())
      res.end(pdfBuffer)
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/records/:id/attachments
// Accepts a single file field named "file", max 10 MB
router.post(
  '/:id/attachments',
  roleGuard(['admin', 'doctor', 'receptionist']),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No se adjuntó ningún archivo' },
        })
        return
      }

      const id           = String(req.params['id'])
      const consultation = await recordsService.uploadAttachment(req.tenantId, id, req.file)
      res.status(200).json({ success: true, data: { consultation } })
    } catch (err) {
      next(err)
    }
  },
)

export { router as recordsRouter }
