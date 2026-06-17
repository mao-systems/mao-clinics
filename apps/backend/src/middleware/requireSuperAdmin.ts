import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '@/config/env'

interface PlatformAccessTokenPayload {
  sub: string
  email: string
  type: string
  iat: number
  exp: number
}

// Reads the separate platformAccessToken cookie (never the tenant accessToken).
// Rejects any tenant-scoped JWT — the distinct token type guarantees no cross-context reuse.
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const token: string | undefined = req.cookies?.platformAccessToken

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'NO_PLATFORM_TOKEN', message: 'Platform authentication required' },
    })
    return
  }

  let payload: PlatformAccessTokenPayload
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as PlatformAccessTokenPayload
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_PLATFORM_TOKEN', message: 'Invalid or expired platform token' },
    })
    return
  }

  // Explicitly reject any token that is not a platform_access token.
  // This prevents a tenant admin from accessing platform routes even with a valid cookie name collision.
  if (payload.type !== 'platform_access') {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_PLATFORM_TOKEN', message: 'Invalid token type for platform access' },
    })
    return
  }

  req.platformAdmin = { id: payload.sub, email: payload.email }
  next()
}
