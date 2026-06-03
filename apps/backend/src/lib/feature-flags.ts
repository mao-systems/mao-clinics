import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@/lib/prisma'

// All available feature flags in the system.
// Add new flags here as new modules are developed.
export const AVAILABLE_FEATURES = [
  'lab_integration',
  'telemedicine',
  'multi_location',
  'patient_portal',
  'advanced_reports',
  'inventory',
  'google_calendar',
  'custom_reports',
] as const

export type FeatureFlag = typeof AVAILABLE_FEATURES[number]

// Check if a tenant has a specific feature enabled
export function hasFeature(
  tenantFeatures: Record<string, unknown> | null | undefined,
  flag: FeatureFlag,
): boolean {
  if (!tenantFeatures) return false
  return tenantFeatures[flag] === true
}

// Middleware factory — use in premium module routes
// Usage: router.use(requireFeature('lab_integration'))
export function requireFeature(flag: FeatureFlag) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: { features: true },
    })
    const features = tenant?.features as Record<string, unknown> | null
    if (!hasFeature(features, flag)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_ENABLED',
          message: `El módulo "${flag}" no está incluido en tu plan. Contacta a MAO Systems para activarlo.`,
        },
      })
    }
    next()
  }
}
