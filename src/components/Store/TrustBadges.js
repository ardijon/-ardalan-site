'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'

const badges = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    key: 'secure',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    key: 'payment',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    key: 'refund',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    key: 'instant',
  },
]

export default function TrustBadges() {
  const { t, locale } = useI18n()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {badges.map((badge) => (
        <div
          key={badge.key}
          className="flex flex-col items-center text-center p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/20 transition-colors"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] mb-3">
            {badge.icon}
          </div>
          <h4 className="text-sm font-bold text-[var(--color-primary)]">
            {t(`trust.${badge.key}.title`)}
          </h4>
          <p className="text-xs text-[var(--color-text)]/50 mt-1">
            {t(`trust.${badge.key}.desc`)}
          </p>
        </div>
      ))}
    </div>
  )
}
