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
      error: { code: 'NO_TOKEN', message: 'Se requiere iniciar sesión para acceder a esta sección.' },
    })
    return
  }

  let payload: AccessTokenPayload
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.' },
    })
    return
  }

  if (payload.type !== 'access') {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token de sesión inválido. Por favor, inicia sesión nuevamente.' },
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
