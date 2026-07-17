'use client'

import { useId } from 'react'

export default function TrustSeal({ size = 80, className = '' }) {
  const gradId = useId()
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-tech)" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        <circle cx="40" cy="40" r="38" fill={`url(#${gradId})`} stroke="var(--color-border)" strokeWidth="1" />
        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-accent)" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.5" />

        <polygon
          points="40,16 56,28 56,44 40,58 24,44 24,28"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.2"
          opacity="0.6"
        />
        <polygon
          points="40,26 48,32 48,42 40,48 32,42 32,32"
          fill="var(--color-accent)"
          fillOpacity="0.12"
          stroke="var(--color-accent)"
          strokeWidth="0.6"
          opacity="0.5"
        />

        <line x1="24" y1="28" x2="40" y2="16" stroke="var(--color-tech)" strokeWidth="0.8" opacity="0.3" />
        <line x1="56" y1="28" x2="40" y2="16" stroke="var(--color-tech)" strokeWidth="0.8" opacity="0.3" />

        <path d="M35 40l3 3 7-7" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>
    </div>
  )
}
