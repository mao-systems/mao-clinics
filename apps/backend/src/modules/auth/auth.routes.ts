import { Router, Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { authService } from './auth.service'
import { LoginSchema } from './auth.schema'
import { authenticateJWT } from '@/middleware/authenticate'
import { setTenantMiddleware } from '@/middleware/setTenant'
import { env } from '@/config/env'

const router = Router()

// 15 minutes, 5 attempts per IP — brute-force protection on the login endpoint
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Try again in 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // trust proxy is already configured at the Express app level (app.set('trust proxy', 1)).
  // Disabling express-rate-limit's own X-Forwarded-For validation avoids the
  // ERR_ERL_UNEXPECTED_X_FORWARDED_FOR error thrown in production behind Nginx
  // where the numeric trust-proxy value doesn't satisfy the library's strict boolean check.
  validate: { xForwardedForHeader: false },
})

const isProduction = env.NODE_ENV === 'production'

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000          // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days

// POST /api/v1/auth/login
router.post(
  '/login',
  loginRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = LoginSchema.parse(req.body)
      const result = await authService.login(body.email, body.password)

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: ACCESS_TOKEN_MAX_AGE,
      })

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_MAX_AGE,
        // Scope the refresh token cookie so it is only sent to the refresh endpoint,
        // reducing its exposure surface
        path: '/api/v1/auth/refresh',
      })

      // Tokens are in cookies — never return them in the response body
      res.status(200).json({ success: true, data: { user: result.user } })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Prefer the httpOnly cookie; fall back to body for API testing
      const token: string | undefined =
        req.cookies?.refreshToken ?? req.body?.refreshToken

      if (!token) {
        res.status(401).json({
          success: false,
          error: { code: 'NO_TOKEN', message: 'Refresh token required' },
        })
        return
      }

      const result = await authService.refresh(token)

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: ACCESS_TOKEN_MAX_AGE,
      })

      res.status(200).json({ success: true, data: { message: 'Token refreshed' } })
    } catch (err) {
      next(err)
    }
  },
)

// POST /api/v1/auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  // Clear both cookies by setting maxAge to 0
  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 0,
  })

  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 0,
    path: '/api/v1/auth/refresh',
  })

  res.status(200).json({ success: true, data: { message: 'Logged out' } })
})

// GET /api/v1/auth/me
router.get(
  '/me',
  authenticateJWT,
  setTenantMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.getMe(req.user.id, req.tenantId)
      res.status(200).json({ success: true, data: { user } })
    } catch (err) {
      next(err)
    }
  },
)

export { router as authRouter }
