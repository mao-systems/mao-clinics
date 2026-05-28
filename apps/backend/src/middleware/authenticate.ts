import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '@/config/env'

interface AccessTokenPayload {
  sub: string
  tenantId: string
  role: string
  type: string
  iat: number
  exp: number
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const token: string | undefined = req.cookies?.accessToken

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'NO_TOKEN', message: 'Authentication required' },
    })
    return
  }

  let payload: AccessTokenPayload
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    })
    return
  }

  if (payload.type !== 'access') {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token type' },
    })
    return
  }

  req.user = {
    id: payload.sub,
    tenantId: payload.tenantId,
    role: payload.role,
  }

  next()
}
