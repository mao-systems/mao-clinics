import { useState } from 'react'

interface TenantLogoProps {
  name: string | null | undefined
  logoUrl: string | null | undefined
  /** Size of the initials avatar square in px (default: 32) */
  size?: number
  /** Additional class for the <img> element when logo is shown */
  imgClassName?: string
}

/**
 * Renders the tenant's logo image when available, otherwise falls back to an
 * SVG initials avatar that uses the tenant's primary CSS theme color.
 *
 * The initials are derived from the first letter of each word in the name
 * (up to 2 characters), so "Clínica San Rafael" → "CS".
 */
export function TenantLogo({ name, logoUrl, size = 32, imgClassName = '' }: TenantLogoProps) {
  const [imgError, setImgError] = useState(false)

  const showFallback = !logoUrl || imgError

  if (!showFallback) {
    return (
      <img
        src={logoUrl!}
        alt={name ?? 'Logo'}
        className={imgClassName}
        style={{ height: size, width: 'auto', objectFit: 'contain' }}
        onError={() => setImgError(true)}
      />
    )
  }

  const initials = getInitials(name)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={name ?? 'Logo'}
      style={{ flexShrink: 0 }}
    >
      <rect width="40" height="40" rx="8" fill="var(--color-primary, #1A5F9E)" />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize={initials.length === 1 ? 20 : 16}
        letterSpacing="0.5"
      >
        {initials}
      </text>
    </svg>
  )
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'M'
  const allWords = name.trim().split(/\s+/).filter((w) => w.length > 0)
  // Skip short connector words (de, la, el, los, las, del) only when
  // there are enough other words to pick initials from
  const words =
    allWords.length > 2
      ? allWords.filter((w) => w.length > 2)
      : allWords
  if (words.length === 0) return 'M'
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
