import { useAuth } from './useAuth'

// All available feature flags — must match backend AVAILABLE_FEATURES
export const FEATURE_FLAGS = [
  'lab_integration',
  'telemedicine',
  'multi_location',
  'patient_portal',
  'advanced_reports',
  'inventory',
  'google_calendar',
  'custom_reports',
] as const

export type FeatureFlag = typeof FEATURE_FLAGS[number]

// Check a single feature flag
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const { user } = useAuth()
  return user?.tenant?.features?.[flag] === true
}

// Check multiple flags — returns object { flag: boolean }
export function useFeatureFlags(flags: FeatureFlag[]): Record<FeatureFlag, boolean> {
  const { user } = useAuth()
  const features = user?.tenant?.features ?? {}
  return Object.fromEntries(
    flags.map(f => [f, features[f] === true]),
  ) as Record<FeatureFlag, boolean>
}
