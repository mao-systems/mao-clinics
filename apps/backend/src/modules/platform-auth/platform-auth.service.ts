import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { env } from '@/config/env'
import { AppError } from '@/lib/errors'

interface PlatformAccessTokenPayload {
  sub: string
  email: string
  type: 'platform_access'
}

interface PlatformLoginResult {
  accessToken: string
  admin: {
    id: string
    email: string
    fullName: string
  }
}

const PLATFORM_ACCESS_TOKEN_EXPIRES_IN = '4h'

export class PlatformAuthService {
  async login(email: string, password: string): Promise<PlatformLoginResult> {
    const admin = await prisma.platformAdmin.findUnique({
      where: { email },
    })

    // Constant-time path regardless of user existence to prevent enumeration
    if (!admin) {
      await bcrypt.compare(password, '$2b$10$invalidhashpaddingtopreventimerattacks')
      throw new AppError('INVALID_CREDENTIALS', 401, 'Correo o contraseña incorrectos')
    }

    const passwordMatch = await bcrypt.compare(password, admin.password_hash)
    if (!passwordMatch) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Correo o contraseña incorrectos')
    }

    // Update last login timestamp (fire-and-forget)
    prisma.platformAdmin
      .update({ where: { id: admin.id }, data: { last_login_at: new Date() } })
      .catch(() => {})

    const payload: PlatformAccessTokenPayload = {
      sub: admin.id,
      email: admin.email,
      type: 'platform_access',
    }

    // Platform tokens are intentionally longer-lived (4h) since this is an
    // internal tool used in active demo/sales sessions, not a 24/7 system.
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: PLATFORM_ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    })

    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.full_name,
      },
    }
  }

  async getMe(adminId: string) {
    const admin = await prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, full_name: true, last_login_at: true, created_at: true },
    })

    if (!admin) {
      throw new AppError('ADMIN_NOT_FOUND', 404, 'Platform admin not found')
    }

    return {
      id: admin.id,
      email: admin.email,
      fullName: admin.full_name,
      lastLoginAt: admin.last_login_at,
      createdAt: admin.created_at,
    }
  }
}

export const platformAuthService = new PlatformAuthService()
