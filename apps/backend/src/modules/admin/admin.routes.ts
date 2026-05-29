import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { authenticateJWT } from '@/middleware/authenticate'
import { setTenantMiddleware } from '@/middleware/setTenant'
import { roleGuard } from '@/middleware/roleGuard'
import { AppError } from '@/lib/errors'
import {
  UpdateThemeSchema,
  CreateDoctorSchema,
  UpdateDoctorSchema,
  CreateUserSchema,
  UpdateUserSchema,
  CreateServiceSchema,
  UpdateServiceSchema,
  ChangePasswordSchema,
  ResetUserPasswordSchema,
} from './admin.schema'
import { adminService } from './admin.service'

const router = Router()

// Auth + tenant resolution for every admin route
router.use(authenticateJWT, setTenantMiddleware)

// ── Routes accessible to ALL authenticated roles ──────────────────────────────

// GET /api/v1/admin/doctors
// Returns ALL doctors (including inactive). Frontend filters active ones client-side
// when needed for appointment forms.
router.get('/doctors', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctors = await adminService.getDoctors(req.tenantId)
    res.status(200).json({ success: true, data: { doctors } })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/admin/change-password
// Any authenticated user can change their own password
router.post('/change-password', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = ChangePasswordSchema.parse(req.body)
    await adminService.changePassword(req.user!.id, body)
    res.status(200).json({ success: true, data: { message: 'Contraseña actualizada correctamente' } })
  } catch (err) {
    next(err)
  }
})

// All routes below this point require the admin role
router.use(roleGuard(['admin']))

// ── Multer setup for logo uploads ─────────────────────────────────────────────

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

// ── Tenant config & theme ─────────────────────────────────────────────────────

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

// ── Doctor management (admin only) ───────────────────────────────────────────

// GET /api/v1/admin/doctors/:id
router.get('/doctors/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctor = await adminService.getDoctorById(req.tenantId, String(req.params['id']))
    res.status(200).json({ success: true, data: { doctor } })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/admin/doctors
router.post('/doctors', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = CreateDoctorSchema.parse(req.body)
    const doctor = await adminService.createDoctor(req.tenantId, body)
    res.status(201).json({ success: true, data: { doctor } })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/admin/doctors/:id
router.put('/doctors/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = UpdateDoctorSchema.parse(req.body)
    const doctor = await adminService.updateDoctor(req.tenantId, String(req.params['id']), body)
    res.status(200).json({ success: true, data: { doctor } })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/admin/doctors/:id/active
router.patch('/doctors/:id/active', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { active } = req.body as { active: boolean }
    if (typeof active !== 'boolean') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_BODY', message: 'Se requiere el campo "active" (boolean)' },
      })
      return
    }
    const doctor = await adminService.toggleDoctorActive(req.tenantId, String(req.params['id']), active)
    res.status(200).json({ success: true, data: { doctor } })
  } catch (err) {
    next(err)
  }
})

// ── User management (admin only) ──────────────────────────────────────────────

// GET /api/v1/admin/users
router.get('/users', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await adminService.getUsers(req.tenantId)
    res.status(200).json({ success: true, data: { users } })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/admin/users
router.post('/users', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = CreateUserSchema.parse(req.body)
    const user = await adminService.createUser(req.tenantId, body)
    res.status(201).json({ success: true, data: { user } })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/admin/users/:id
router.put('/users/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = UpdateUserSchema.parse(req.body)
    const user = await adminService.updateUser(req.tenantId, req.user!.id, String(req.params['id']), body)
    res.status(200).json({ success: true, data: { user } })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/admin/users/:id/reset-password
router.post('/users/:id/reset-password', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await adminService.resetUserPassword(req.tenantId, req.user!.id, String(req.params['id']))
    res.status(200).json({ success: true, data: { message: 'Contraseña restablecida. El usuario recibirá un correo con sus nuevas credenciales.' } })
  } catch (err) {
    next(err)
  }
})

// ── Service catalog (admin only) ─────────────────────────────────────────────

// GET /api/v1/admin/services
router.get('/services', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const services = await adminService.getServices(req.tenantId)
    res.status(200).json({ success: true, data: { services } })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/admin/services
router.post('/services', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = CreateServiceSchema.parse(req.body)
    const service = await adminService.createService(req.tenantId, body)
    res.status(201).json({ success: true, data: { service } })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/admin/services/:id
router.put('/services/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = UpdateServiceSchema.parse(req.body)
    const service = await adminService.updateService(req.tenantId, String(req.params['id']), body)
    res.status(200).json({ success: true, data: { service } })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/admin/services/:id
router.delete('/services/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await adminService.deleteService(req.tenantId, String(req.params['id']))
    res.status(200).json({ success: true, data: { message: 'Servicio eliminado' } })
  } catch (err) {
    next(err)
  }
})

export { router as adminRouter }
