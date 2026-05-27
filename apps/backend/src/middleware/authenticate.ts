import { Request, Response, NextFunction } from 'express'

// Stub — full JWT verification implemented in Step 03 (auth module)
export function authenticateJWT(_req: Request, _res: Response, next: NextFunction): void {
  next()
}
