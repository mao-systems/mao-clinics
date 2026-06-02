import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // Must declare 4 params so Express recognises this as an error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    })
    return
  }

  if (err instanceof ZodError) {
    // Use the first human-readable Zod message; field messages are already in Spanish
    const firstMessage = err.errors[0]?.message ?? 'Datos de entrada inválidos'
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstMessage,
        details: err.errors,
      },
    })
    return
  }

  // Unexpected error — log full details server-side, never expose internals to clients
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  logger.error('Unhandled error', { message, stack })

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error inesperado. Por favor inténtalo de nuevo.',
    },
  })
}
