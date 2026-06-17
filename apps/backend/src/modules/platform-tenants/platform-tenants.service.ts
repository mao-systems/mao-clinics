import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import type { z } from 'zod'
import type { CreateTenantSchema } from './platform-tenants.schema'

type CreateTenantInput = z.infer<typeof CreateTenantSchema>

// Default theme for newly created tenants — uses MAO Systems brand palette (general clinic)
const DEFAULT_THEME = {
  primary: '#1A5F9E',
  primary_light: '#E6F1FB',
  primary_dark: '#0C3F6B',
  secondary: '#2EAA6E',
  secondary_light: '#E8F5EE',
  surface: '#F7FAFB',
  sidebar_bg: '#1A2740',
  sidebar_text: '#FFFFFF',
  border_radius: '8px',
  logo_url: null,
}

export class PlatformTenantsService {
  async listTenants() {
    const tenants = await prisma.tenant.findMany({
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        name: true,
        subdomain: true,
        ruc: true,
        plan: true,
        plan_price_soles: true,
        active: true,
        features: true,
        theme_config: true,
        created_at: true,
        _count: {
          select: {
            users: true,
            patients: true,
            appointments: true,
          },
        },
      },
    })

    return tenants.map((t) => ({
      ...t,
      plan_price_soles: Number(t.plan_price_soles),
    }))
  }

  async updateFeatures(tenantId: string, features: Record<string, boolean>) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not found')
    }

    // Merge new flags into existing JSON — don't overwrite the whole object
    // so that flags set outside this panel are preserved
    const currentFeatures = (tenant.features as Record<string, unknown>) ?? {}
    const merged = { ...currentFeatures, ...features }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { features: merged as Prisma.InputJsonValue },
      select: { id: true, name: true, features: true },
    })

    return updated
  }

  async createTenant(input: CreateTenantInput) {
    // Check uniqueness before entering the transaction to get clearer error messages
    const [existingSubdomain, existingRuc] = await Promise.all([
      prisma.tenant.findUnique({ where: { subdomain: input.subdomain } }),
      prisma.tenant.findUnique({ where: { ruc: input.ruc } }),
    ])

    if (existingSubdomain) {
      throw new AppError('SUBDOMAIN_TAKEN', 409, `Subdomain "${input.subdomain}" is already in use`)
    }
    if (existingRuc) {
      throw new AppError('RUC_TAKEN', 409, `RUC "${input.ruc}" is already registered`)
    }

    const passwordHash = await bcrypt.hash(input.adminPassword, 10)
    const themeConfig = input.theme_config ?? DEFAULT_THEME

    // Create tenant + first admin user in a single transaction — atomicity
    // ensures we never end up with a tenant without an admin or vice versa
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.name,
          ruc: input.ruc,
          subdomain: input.subdomain,
          plan: input.plan,
          plan_price_soles: input.plan_price_soles,
          theme_config: themeConfig as Prisma.InputJsonValue,
          features: {},
        },
      })

      const adminUser = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          email: input.adminEmail,
          password_hash: passwordHash,
          first_name: input.adminFirstName,
          last_name: input.adminLastName,
          role: 'admin',
          must_change_password: true,
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
        },
      })

      return { tenant, adminUser }
    })

    return {
      tenant: {
        ...result.tenant,
        plan_price_soles: Number(result.tenant.plan_price_soles),
      },
      adminUser: result.adminUser,
    }
  }

  async getDashboardStats() {
    const [totalTenants, activeTenants, tenantPrices] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { active: true } }),
      prisma.tenant.findMany({ select: { plan_price_soles: true, active: true } }),
    ])

    const mrr = tenantPrices
      .filter((t) => t.active)
      .reduce((sum, t) => sum + Number(t.plan_price_soles), 0)

    return {
      totalTenants,
      activeTenants,
      inactiveTenants: totalTenants - activeTenants,
      estimatedMrrSoles: Math.round(mrr * 100) / 100,
    }
  }
}

export const platformTenantsService = new PlatformTenantsService()
