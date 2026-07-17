'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/40 to-transparent mx-auto mb-8" />
        <h1 className="text-6xl sm:text-7xl font-black text-[var(--color-primary)]">{t('notFound.title')}</h1>
        <p className="mt-4 text-[var(--color-text)]/50">{t('notFound.message')}</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white font-medium rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--color-accent)]/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t('notFound.back')}
        </Link>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/40 to-transparent mx-auto mt-8" />
      </div>
    </div>
  )
}
