'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'

export default function SocialProof() {
  const { locale } = useI18n()

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-6">
      <div className="flex items-center gap-1.5 text-sm text-[var(--color-text)]/60">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
        <span>
          {locale === 'fa' ? 'پشتیبانی فعال' : 'Active Support'}
        </span>
      </div>

      <div className="hidden sm:block w-px h-4 bg-[var(--color-border)]" />

      <div className="flex items-center gap-1.5 text-sm text-[var(--color-text)]/60">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          {locale === 'fa' ? 'تحویل فوری' : 'Instant Delivery'}
        </span>
      </div>

      <div className="hidden sm:block w-px h-4 bg-[var(--color-border)]" />

      <div className="flex items-center gap-1.5 text-sm text-[var(--color-text)]/60">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>
          {locale === 'fa' ? 'ضمانت کیفیت' : 'Quality Guarantee'}
        </span>
      </div>
    </div>
  )
}
