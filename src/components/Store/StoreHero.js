'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'
import { useInView } from '@/hooks/useInView'
import { useEffect, useState } from 'react'

export default function StoreHero() {
  const { t, locale } = useI18n()
  const [ref, visible] = useInView({ threshold: 0.08 })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const features = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      text: locale === 'fa' ? 'تحویل فوری' : 'Instant Delivery'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
          <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      text: locale === 'fa' ? 'کد قابل ویرایش' : 'Editable Code'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      text: locale === 'fa' ? 'ضمانت ۷ روزه' : '7-Day Guarantee'
    },
  ]

  return (
    <section className="relative pt-32 sm:pt-36 pb-12 sm:pb-16 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-[var(--color-accent)]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[var(--color-tech)]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className="text-center max-w-3xl mx-auto"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: prefersReducedMotion ? 'none' : 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--color-primary)] leading-loose">
            {locale === 'fa' ? (
              <>
                قالب‌های <span className="text-[var(--color-accent)]">حرفه‌ای</span>
                <br />
                برای شروع <span className="text-[var(--color-accent)]">سریع</span>
              </>
            ) : (
              <>
                Professional <span className="text-[var(--color-accent)]">Templates</span>
                <br />
                for a <span className="text-[var(--color-accent)]">Quick</span> Start
              </>
            )}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-[var(--color-text)]/60 max-w-xl mx-auto">
            {t('store.subtitle')}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2"
                style={{
                  opacity: visible ? 1 : 0,
                  transition: prefersReducedMotion ? 'none' : `opacity 0.5s ease ${0.2 + i * 0.1}s`,
                }}
              >
                <span className="text-base">{feature.icon}</span>
                <span className="text-sm text-[var(--color-text)]/50">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
