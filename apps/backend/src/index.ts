import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from '@/config/env'
import { logger } from '@/lib/logger'
import { errorHandler } from '@/middleware/errorHandler'

const app = express()

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
)
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API v1 router — modules mounted here as they are implemented
const apiRouter = express.Router()

// Placeholder: routes will be registered here in subsequent steps
// e.g. apiRouter.use('/auth', authRouter)
// e.g. apiRouter.use('/patients', authenticateJWT, setTenantMiddleware, patientsRouter)

app.use('/api/v1', apiRouter)

// Global error handler (must be last middleware)
app.use(errorHandler)

const PORT = parseInt(env.PORT, 10)

app.listen(PORT, () => {
  logger.info(`Backend running on http://localhost:${PORT}`)
  logger.info(`Environment: ${env.NODE_ENV}`)
})

export default app
