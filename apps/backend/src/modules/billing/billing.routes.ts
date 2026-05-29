import { Router, Request, Response, NextFunction } from 'express'
import { authenticateJWT } from '@/middleware/authenticate'
import { setTenantMiddleware } from '@/middleware/setTenant'
import { roleGuard } from '@/middleware/roleGuard'
import { BillingQuerySchema, CreateInvoiceSchema, CancelInvoiceSchema } from './billing.schema'
import { billingService } from './billing.service'

const router = Router()

// Every billing route requires a valid JWT + resolved tenant
router.use(authenticateJWT, setTenantMiddleware)

// GET /api/v1/billing/summary — monthly KPIs (admin only)
router.get(
  '/summary',
  roleGuard(['admin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Default: current calendar month (UTC boundaries — summary is approximate for dashboards)
      const now  = new Date()
      const from = req.query['from']
        ? new Date(String(req.query['from']))
        : new Date(now.getFullYear(), now.getMonth(), 1)
      const to   = req.query['to']
        ? new Date(String(req.query['to']))
        : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      const summary = await billingService.getSummary(req.tenantId, from, to)
      res.status(200).json({ success: true, data: summary })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/billing — list invoices (paginated)
router.get(
  '/',
  roleGuard(['admin', 'receptionist']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query  = BillingQuerySchema.parse(req.query)
      const result = await billingService.findAll(req.tenantId, query)
      res.status(200).json({ success: true, data: result.data, meta: result.meta })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/billing/:id — single invoice
router.get(
  '/:id',
  roleGuard(['admin', 'receptionist']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id      = String(req.params['id'])
      const invoice = await billingService.findById(req.tenantId, id)
      res.status(200).json({ success: true, data: { invoice } })
    } catch (err) {
      next(err)
    }
  },
)

// GET /api/v1/billing/:id/pdf — stream the invoice PDF
router.get(
  '/:id/pdf',
  roleGuard(['admin', 'receptionist', 'doctor']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id      = String(req.params['id'])
      const invoice = await billingService.findById(req.tenantId, id)
      const buffer  = await billingService.getPdf(req.tenantId, id)
      const filename = `${invoice.series}-${String(invoice.number).padStart(8, '0')}.pdf`

      res.setHeader('Content-Type',        'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
      res.setHeader('Content-Length',      buffer.length.toString())
      res.end(buffer)
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/billing — create invoice
router.post(
  '/',
  roleGuard(['admin', 'receptionist']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body    = CreateInvoiceSchema.parse(req.body)
      const invoice = await billingService.create(req.tenantId, body)
      res.status(201).json({ success: true, data: { invoice } })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/billing/:id/cancel — void an invoice (admin only)
router.post(
  '/:id/cancel',
  roleGuard(['admin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id     = String(req.params['id'])
      const { reason } = CancelInvoiceSchema.parse(req.body)
      const invoice = await billingService.cancel(req.tenantId, id, reason)
      res.status(200).json({ success: true, data: { invoice } })
    } catch (err) {
      next(err)
    }
  },
)

export { router as billingRouter }
