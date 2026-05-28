import { Router, Request, Response, NextFunction } from 'express'
import { AppointmentStatus } from '@prisma/client'
import { authenticateJWT } from '@/middleware/authenticate'
import { setTenantMiddleware } from '@/middleware/setTenant'
import { roleGuard } from '@/middleware/roleGuard'
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  UpdateStatusSchema,
  AppointmentQuerySchema,
  AvailabilityQuerySchema,
} from './appointments.schema'
import { appointmentsService } from './appointments.service'

// Statuses that doctor role is allowed to set directly
const DOCTOR_ALLOWED_STATUSES: AppointmentStatus[] = [
  'in_progress',
  'completed',
  'no_show',
]

const router = Router()

// All appointments routes require a valid JWT and a resolved tenant
router.use(authenticateJWT, setTenantMiddleware)

// GET /api/v1/appointments
// Used by FullCalendar to fetch the visible week range (from/to query params)
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = AppointmentQuerySchema.parse(req.query)
    const result = await appointmentsService.findAll(req.tenantId, query)
    res.status(200).json({ success: true, data: result.data, meta: result.meta })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/appointments/availability
// Must be declared BEFORE /:id to avoid route shadowing
router.get('/availability', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { doctor_id, date, duration_min } = AvailabilityQuerySchema.parse(req.query)
    const slots = await appointmentsService.getAvailability(
      req.tenantId,
      doctor_id,
      date,
      duration_min,
    )
    res.status(200).json({ success: true, data: slots })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/appointments/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params['id'])
    const appointment = await appointmentsService.findById(req.tenantId, id)
    res.status(200).json({ success: true, data: { appointment } })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/appointments
router.post(
  '/',
  roleGuard(['admin', 'receptionist']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = CreateAppointmentSchema.parse(req.body)
      const appointment = await appointmentsService.create(req.tenantId, body)
      res.status(201).json({ success: true, data: { appointment } })
    } catch (err) {
      next(err)
    }
  },
)

// PUT /api/v1/appointments/:id
router.put(
  '/:id',
  roleGuard(['admin', 'receptionist']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'])
      const body = UpdateAppointmentSchema.parse(req.body)
      const appointment = await appointmentsService.update(req.tenantId, id, body)
      res.status(200).json({ success: true, data: { appointment } })
    } catch (err) {
      next(err)
    }
  },
)

// PATCH /api/v1/appointments/:id/status
router.patch(
  '/:id/status',
  roleGuard(['admin', 'receptionist', 'doctor']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'])
      const body = UpdateStatusSchema.parse(req.body)

      // Doctors may only move appointments to their allowed statuses
      if (
        req.user.role === 'doctor' &&
        !DOCTOR_ALLOWED_STATUSES.includes(body.status as AppointmentStatus)
      ) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message:
              'Los médicos solo pueden actualizar el estado a: en curso, completada o no asistió',
          },
        })
        return
      }

      const appointment = await appointmentsService.updateStatus(
        req.tenantId,
        id,
        body.status as AppointmentStatus,
        body.cancelled_reason,
      )
      res.status(200).json({ success: true, data: { appointment } })
    } catch (err) {
      next(err)
    }
  },
)

// DELETE /api/v1/appointments/:id — admin only, soft-deletes by cancelling
router.delete(
  '/:id',
  roleGuard(['admin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params['id'])
      await appointmentsService.softDelete(req.tenantId, id)
      res.status(200).json({ success: true, data: { message: 'Cita cancelada correctamente' } })
    } catch (err) {
      next(err)
    }
  },
)

export { router as appointmentsRouter }
