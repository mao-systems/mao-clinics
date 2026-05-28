import { Request, Response, NextFunction } from 'express'

/**
 * Factory that returns middleware restricting access to the given roles.
 * Must be used after authenticateJWT (which populates req.user).
 *
 * Usage: router.get('/admin', authenticateJWT, setTenantMiddleware, roleGuard(['admin']), handler)
 */
export function roleGuard(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      })
      return
    }
    next()
  }
}
