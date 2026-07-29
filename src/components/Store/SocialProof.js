'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function SocialProof() {
  const { t, locale } = useI18n()
  const [viewers, setViewers] = useState(0)

  useEffect(() => {
    setViewers(Math.floor(Math.random() * 5) + 8)
    const interval = setInterval(() => {
      setViewers(prev => {
        const change = Math.floor(Math.random() * 3) - 1
        return Math.max(5, Math.min(20, prev + change))
      })
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-6">
      <div className="flex items-center gap-2 text-sm text-[var(--color-text)]/60">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>
          {locale === 'fa'
            ? `${viewers} نفر در حال مشاهده`
            : `${viewers} people viewing`}
        </span>
      </div>

      <div className="hidden sm:block w-px h-4 bg-[var(--color-border)]" />

      <div className="flex items-center gap-1.5 text-sm text-[var(--color-text)]/60">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <span className="font-bold text-[var(--color-primary)]">4.9</span>
        <span>/5</span>
      </div>

      <div className="hidden sm:block w-px h-4 bg-[var(--color-border)]" />

      <div className="flex items-center gap-1.5 text-sm text-[var(--color-text)]/60">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
        <span>
          {locale === 'fa' ? '+۱۲۰ خریدار' : '+120 buyers'}
        </span>
      </div>
    </div>
  )
}
