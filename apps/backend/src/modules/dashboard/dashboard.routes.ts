import { Router, Request, Response, NextFunction } from 'express'
import { authenticateJWT } from '@/middleware/authenticate'
import { setTenantMiddleware } from '@/middleware/setTenant'
import { roleGuard } from '@/middleware/roleGuard'
import { runRemindersJob } from '@/jobs/reminders.job'
import { dashboardService } from './dashboard.service'

const router = Router()

// All dashboard routes require a valid JWT + resolved tenant.
// All roles (admin, doctor, receptionist) can view the dashboard.
router.use(authenticateJWT, setTenantMiddleware)

// GET /api/v1/dashboard/stats — KPI cards
router.get(
  '/stats',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await dashboardService.getStats(req.tenantId)
      res.status(200).json({ success: true, data: stats })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/dashboard/chart-appointments — last 8 weeks appointment chart
router.get(
  '/chart-appointments',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await dashboardService.getChartAppointments(req.tenantId)
      res.status(200).json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/dashboard/chart-revenue — last 8 weeks revenue chart
router.get(
  '/chart-revenue',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await dashboardService.getChartRevenue(req.tenantId)
      res.status(200).json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/dashboard/today — today's appointment list
router.get(
  '/today',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appointments = await dashboardService.getTodayAppointments(req.tenantId)
      res.status(200).json({ success: true, data: appointments })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/dashboard/trigger-reminders — TEMPORARY: manually fire the reminders job
// Admin only. Remove this route before going to production.
router.get(
  '/trigger-reminders',
  roleGuard(['admin']),
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const processed = await runRemindersJob()
      res.status(200).json({
        success: true,
        data: { message: `Reminders job executed — ${processed} reminder(s) processed` },
      })
    } catch (err) {
      next(err)
    }
  },
)

export { router as dashboardRouter }
