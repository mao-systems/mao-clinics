import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { env } from '@/config/env'
import { AppError } from '@/lib/errors'

interface AccessTokenPayload {
  sub: string
  tenantId: string
  role: string
  type: 'access'
}

interface RefreshTokenPayload {
  sub: string
  tenantId: string
  type: 'refresh'
}

interface LoginResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    tenant: {
      id: string
      name: string
      subdomain: string
      plan: string
      theme_config: unknown
    }
  }
}

interface RefreshResult {
  accessToken: string
}

interface MeResult {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  mustChangePassword: boolean
  lastLoginAt: Date | null
  tenant: {
    id: string
    name: string
    subdomain: string
    plan: string
    theme_config: unknown
  }
  doctor?: {
    id: string
    specialty: string
    cmp: string | null
    photo_url: string | null
    bio: string | null
    consultation_duration: number
  } | null
}

export class AuthService {
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await prisma.user.findFirst({
      where: { email },
      include: { tenant: true },
    })

    // Use a constant-time comparison path regardless of whether user was found
    // to prevent user enumeration via timing attacks
    if (!user || !user.active) {
      // Still run bcrypt to prevent timing-based enumeration
      await bcrypt.compare(password, '$2b$10$invalidhashpaddingtopreventimerattacks')
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password')
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password')
    }

    // Update last login timestamp (fire-and-forget — don't block the response)
    prisma.user
      .update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      })
      .catch(() => {
        // Non-critical: log but don't fail the login
      })

    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      type: 'access',
    }

    const refreshTokenPayload: RefreshTokenPayload = {
      sub: user.id,
      tenantId: user.tenant_id,
      type: 'refresh',
    }

    const accessToken = jwt.sign(accessTokenPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    })

    const refreshToken = jwt.sign(refreshTokenPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          subdomain: user.tenant.subdomain,
          plan: user.tenant.plan,
          theme_config: user.tenant.theme_config,
        },
      },
    }
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    let payload: RefreshTokenPayload

    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload
    } catch {
      throw new AppError('INVALID_TOKEN', 401, 'Invalid or expired refresh token')
    }

    if (payload.type !== 'refresh') {
      throw new AppError('INVALID_TOKEN', 401, 'Invalid token type')
    }

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, active: true },
    })

    if (!user) {
      throw new AppError('INVALID_TOKEN', 401, 'User not found or inactive')
    }

    const accessTokenPayload: AccessTokenPayload = {
      sub: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      type: 'access',
    }

    const accessToken = jwt.sign(accessTokenPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    })

    return { accessToken }
  }

  async getMe(userId: string, tenantId: string): Promise<MeResult> {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenant_id: tenantId, active: true },
      include: {
        tenant: true,
        doctor: true,
      },
    })

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found')
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      mustChangePassword: user.must_change_password,
      lastLoginAt: user.last_login_at,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        subdomain: user.tenant.subdomain,
        plan: user.tenant.plan,
        theme_config: user.tenant.theme_config,
      },
      doctor: user.doctor
        ? {
            id: user.doctor.id,
            specialty: user.doctor.specialty,
            cmp: user.doctor.cmp,
            photo_url: user.doctor.photo_url,
            bio: user.doctor.bio,
            consultation_duration: user.doctor.consultation_duration,
          }
        : null,
    }
  }
}

export const authService = new AuthService()
