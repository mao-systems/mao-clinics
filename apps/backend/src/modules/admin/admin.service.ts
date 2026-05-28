import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import { getStorageProvider } from '@/lib/storage'
import type { ThemeConfig } from './admin.schema'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

interface TenantConfig {
  id: string
  name: string
  subdomain: string
  ruc: string
  plan: string
  theme_config: unknown
}

export class AdminService {
  async updateTheme(tenantId: string, theme: ThemeConfig): Promise<TenantConfig> {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { theme_config: theme },
    })

    return this.formatTenant(tenant)
  }

  async uploadLogo(tenantId: string, file: Express.Multer.File): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new AppError(
        'INVALID_FILE_TYPE',
        400,
        'Solo se permiten imágenes (JPEG, PNG, WebP, SVG)',
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError('FILE_TOO_LARGE', 400, 'El archivo no puede superar los 2 MB')
    }

    const key = `logos/${tenantId}/${Date.now()}-${file.originalname}`
    const storageProvider = getStorageProvider()
    const url = await storageProvider.upload(file, key)

    // Merge logo_url into the existing theme_config rather than replacing it
    const existing = await prisma.tenant.findUnique({ where: { id: tenantId } })
    const currentTheme =
      existing?.theme_config && typeof existing.theme_config === 'object'
        ? (existing.theme_config as Record<string, unknown>)
        : {}

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { theme_config: { ...currentTheme, logo_url: url } },
    })

    return url
  }

  async removeLogo(tenantId: string): Promise<void> {
    const existing = await prisma.tenant.findUnique({ where: { id: tenantId } })
    const currentTheme =
      existing?.theme_config && typeof existing.theme_config === 'object'
        ? (existing.theme_config as Record<string, unknown>)
        : {}

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { theme_config: { ...currentTheme, logo_url: null } },
    })
  }

  async getTenantConfig(tenantId: string): Promise<TenantConfig> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not found')
    }

    return this.formatTenant(tenant)
  }

  private formatTenant(tenant: {
    id: string
    name: string
    subdomain: string
    ruc: string
    plan: string
    theme_config: unknown
  }): TenantConfig {
    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      ruc: tenant.ruc,
      plan: tenant.plan,
      theme_config: tenant.theme_config,
    }
  }
}

export const adminService = new AdminService()
