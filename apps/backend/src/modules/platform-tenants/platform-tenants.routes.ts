import { Router, Request, Response, NextFunction } from 'express'
import { requireSuperAdmin } from '@/middleware/requireSuperAdmin'
import { UpdateFeaturesSchema, CreateTenantSchema } from './platform-tenants.schema'
import { platformTenantsService } from './platform-tenants.service'

const router = Router()

// All platform-tenants routes require a valid platformAccessToken cookie
router.use(requireSuperAdmin)

// GET /platform/tenants
router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenants = await platformTenantsService.listTenants()
    res.status(200).json({ success: true, data: { tenants } })
  } catch (err) {
    next(err)
  }
})

// GET /platform/tenants/stats
router.get('/stats', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await platformTenantsService.getDashboardStats()
    res.status(200).json({ success: true, data: stats })
  } catch (err) {
    next(err)
  }
})

// POST /platform/tenants
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = CreateTenantSchema.parse(req.body)
    const result = await platformTenantsService.createTenant(body)
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// PATCH /platform/tenants/:id/features
router.patch('/:id/features', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = UpdateFeaturesSchema.parse(req.body)
    const updated = await platformTenantsService.updateFeatures(String(req.params['id']), body.features)
    res.status(200).json({ success: true, data: { tenant: updated } })
  } catch (err) {
    next(err)
  }
})

export { router as platformTenantsRouter }
