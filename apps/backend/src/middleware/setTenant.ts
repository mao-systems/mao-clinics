import { Request, Response, NextFunction } from 'express'

// Stub — reads req.user.tenantId and sets req.tenantId (implemented in Step 03)
export function setTenantMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next()
}
