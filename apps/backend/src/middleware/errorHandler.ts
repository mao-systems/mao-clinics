import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '@/lib/logger'

interface AppError extends Error {
  status?: number
  code?: string
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
    })
    return
  }

  const status = err.status ?? 500
  const code = err.code ?? 'INTERNAL_SERVER_ERROR'
  const message = status === 500 ? 'An unexpected error occurred' : err.message

  if (status === 500) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack })
  }

  res.status(status).json({
    success: false,
    error: { code, message },
  })
}
