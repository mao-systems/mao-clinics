import path from 'path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from '@/config/env'
import { logger } from '@/lib/logger'
import { errorHandler } from '@/middleware/errorHandler'
import { authRouter } from '@/modules/auth/auth.routes'
import { adminRouter } from '@/modules/admin/admin.routes'
import { patientsRouter } from '@/modules/patients/patients.routes'
import { appointmentsRouter } from '@/modules/appointments/appointments.routes'

const app = express()

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// Signed cookie secret prevents clients from tampering with cookie values
app.use(cookieParser(env.COOKIE_SECRET))

// Serve uploaded files (logos, attachments) stored locally in dev
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API v1 router — modules mounted here as they are implemented
const apiRouter = express.Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/admin', adminRouter)
apiRouter.use('/patients', patientsRouter)
apiRouter.use('/appointments', appointmentsRouter)

app.use('/api/v1', apiRouter)

// Global error handler (must be last middleware)
app.use(errorHandler)

const PORT = parseInt(env.PORT, 10)

app.listen(PORT, () => {
  logger.info(`Backend running on http://localhost:${PORT}`)
  logger.info(`Environment: ${env.NODE_ENV}`)
})

export default app
