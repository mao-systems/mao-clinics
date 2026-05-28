import { differenceInYears, parseISO } from 'date-fns'
import type { Patient } from '@mao-systems/shared'

export function formatPatientName(p: Pick<Patient, 'first_name' | 'last_name'>): string {
  return `${p.last_name}, ${p.first_name}`
}

export function formatAge(dateOfBirth: string | null | undefined): string {
  if (!dateOfBirth) return '—'
  try {
    const dob = parseISO(dateOfBirth)
    const age = differenceInYears(new Date(), dob)
    return `${age} años`
  } catch {
    return '—'
  }
}

export function formatDNI(dni: string): string {
  // Peruvian DNI is 8 digits — format with dots: 47.823.651
  if (dni.length !== 8) return dni
  return `${dni.slice(0, 2)}.${dni.slice(2, 5)}.${dni.slice(5)}`
}

export function getSexLabel(sex: string | null | undefined): string {
  if (!sex) return '—'
  const labels: Record<string, string> = {
    M: 'Masculino',
    F: 'Femenino',
    Other: 'Otro',
  }
  return labels[sex] ?? '—'
}

export function getSexIcon(sex: string | null | undefined): string {
  if (sex === 'M') return '♂'
  if (sex === 'F') return '♀'
  return '—'
}

export function getBloodTypeColor(type: string | null | undefined): string {
  if (!type) return '#9CA3AF'
  const colors: Record<string, string> = {
    'O+': '#EF4444',
    'O-': '#DC2626',
    'A+': '#3B82F6',
    'A-': '#2563EB',
    'B+': '#8B5CF6',
    'B-': '#7C3AED',
    'AB+': '#F59E0B',
    'AB-': '#D97706',
  }
  return colors[type] ?? '#6B7280'
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  // Format Peruvian 9-digit phone: 987 234 561
  if (phone.length === 9) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`
  }
  return phone
}

export function getPatientInitials(p: Pick<Patient, 'first_name' | 'last_name'>): string {
  const first = p.first_name?.[0] ?? ''
  const last = p.last_name?.[0] ?? ''
  return `${first}${last}`.toUpperCase()
}
