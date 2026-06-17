import { Router, Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { PlatformLoginSchema } from './platform-auth.schema'
import { platformAuthService } from './platform-auth.service'
import { requireSuperAdmin } from '@/middleware/requireSuperAdmin'
import { env } from '@/config/env'

const router = Router()

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again in 15 minutes.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
})

const isProduction = env.NODE_ENV === 'production'
const PLATFORM_TOKEN_MAX_AGE = 4 * 60 * 60 * 1000 // 4 hours

// POST /platform/auth/login
router.post(
  '/login',
  loginRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = PlatformLoginSchema.parse(req.body)
      const result = await platformAuthService.login(body.email, body.password)

      // Use a separate cookie name so it can never be confused with a tenant accessToken.
      // This prevents any tenant JWT from being accepted by requireSuperAdmin().
      res.cookie('platformAccessToken', result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: PLATFORM_TOKEN_MAX_AGE,
      })

      res.status(200).json({ success: true, data: { admin: result.admin } })
    } catch (err) {
      next(err)
    }
  },
)

// POST /platform/auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  res.cookie('platformAccessToken', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 0,
  })
  res.status(200).json({ success: true, data: { message: 'Logged out' } })
})

// GET /platform/auth/me
router.get(
  '/me',
  requireSuperAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const admin = await platformAuthService.getMe(req.platformAdmin.id)
      res.status(200).json({ success: true, data: { admin } })
    } catch (err) {
      next(err)
    }
  },
)

export { router as platformAuthRouter }
