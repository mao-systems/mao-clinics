import { Router, Request, Response, NextFunction } from 'express'
import { authenticateJWT } from '@/middleware/authenticate'
import { setTenantMiddleware } from '@/middleware/setTenant'
import { roleGuard } from '@/middleware/roleGuard'
import { CreatePatientSchema, UpdatePatientSchema, PatientQuerySchema } from './patients.schema'
import { patientsService } from './patients.service'

const router = Router()

// All patients routes require a valid JWT and a resolved tenant
router.use(authenticateJWT, setTenantMiddleware)

// GET /api/v1/patients — all authenticated roles can list patients
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = PatientQuerySchema.parse(req.query)
    const result = await patientsService.findAll(req.tenantId, query)
    res.status(200).json({ success: true, data: result.data, meta: result.meta })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/patients/:id — all authenticated roles
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params['id'])
    const patient = await patientsService.findById(req.tenantId, id)
    res.status(200).json({ success: true, data: { patient } })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/patients/:id/history — all authenticated roles
router.get(
  '/:id/history',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'])
      const history = await patientsService.getHistory(req.tenantId, id)
      res.status(200).json({ success: true, data: history })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/patients — admin and receptionist only
router.post(
  '/',
  roleGuard(['admin', 'receptionist']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = CreatePatientSchema.parse(req.body)
      const patient = await patientsService.create(req.tenantId, body)
      res.status(201).json({ success: true, data: { patient } })
    } catch (err) {
      next(err)
    }
  },
)

// PUT /api/v1/patients/:id — admin and receptionist only
router.put(
  '/:id',
  roleGuard(['admin', 'receptionist']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'])
      const body = UpdatePatientSchema.parse(req.body)
      const patient = await patientsService.update(req.tenantId, id, body)
      res.status(200).json({ success: true, data: { patient } })
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /api/v1/patients/:id — admin only
router.delete(
  '/:id',
  roleGuard(['admin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'])
      await patientsService.softDelete(req.tenantId, id)
      res
        .status(200)
        .json({ success: true, data: { message: 'Paciente eliminado correctamente' } })
    } catch (err) {
      next(err)
    }
  },
)

export { router as patientsRouter }
