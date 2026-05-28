import { Request, Response, NextFunction } from 'express'

/**
 * Sets req.tenantId from the JWT payload already parsed by authenticateJWT.
 * The tenant ID is NEVER read from the request body, params, or query string —
 * only from the signed JWT, so a user cannot impersonate another tenant.
 */
export function setTenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.tenantId = req.user.tenantId
  next()
}
