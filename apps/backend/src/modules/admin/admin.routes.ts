import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { authenticateJWT } from '@/middleware/authenticate'
import { setTenantMiddleware } from '@/middleware/setTenant'
import { roleGuard } from '@/middleware/roleGuard'
import { AppError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { UpdateThemeSchema } from './admin.schema'
import { adminService } from './admin.service'

const router = Router()

// Auth + tenant resolution for every admin route
router.use(authenticateJWT, setTenantMiddleware)

// ── GET /api/v1/admin/doctors ─────────────────────────────────────────────────
// Accessible to ALL authenticated roles — used by AppointmentForm to populate
// the doctor selector regardless of the requesting user's role.
router.get('/doctors', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { tenant_id: req.tenantId, active: true },
      include: {
        user: { select: { first_name: true, last_name: true } },
      },
      orderBy: { specialty: 'asc' },
    })
    res.status(200).json({ success: true, data: { doctors } })
  } catch (err) {
    next(err)
  }
})

// All routes below this point require the admin role
router.use(roleGuard(['admin']))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new AppError('INVALID_FILE_TYPE', 400, 'Solo se permiten imágenes (JPEG, PNG, WebP, SVG)'))
    }
  },
})

// GET /api/v1/admin/config
router.get('/config', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenant = await adminService.getTenantConfig(req.tenantId)
    res.status(200).json({ success: true, data: { tenant } })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/admin/theme
router.put('/theme', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = UpdateThemeSchema.parse(req.body)
    const tenant = await adminService.updateTheme(req.tenantId, body.theme)
    res.status(200).json({
      success: true,
      data: { tenant, message: 'Tema actualizado correctamente' },
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/admin/logo
router.post(
  '/logo',
  upload.single('logo'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No se recibió ningún archivo' },
        })
        return
      }

      const logo_url = await adminService.uploadLogo(req.tenantId, req.file)
      res.status(200).json({
        success: true,
        data: { logo_url, message: 'Logo actualizado correctamente' },
      })
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /api/v1/admin/logo
router.delete('/logo', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await adminService.removeLogo(req.tenantId)
    res.status(200).json({ success: true, data: { message: 'Logo eliminado' } })
  } catch (err) {
    next(err)
  }
})

export { router as adminRouter }
