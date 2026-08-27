'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'
import { useInView } from '@/hooks/useInView'
import { useEffect, useState } from 'react'

// The three claims that carry the store, so each one has to be provable: a real
// demo URL, a one-person support channel, Iranian infrastructure. The previous
// set led with a 7-day money-back guarantee that existed nowhere but this array.
const featureIcons = [
  // eye — live demo
  <svg key="demo" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>,
  // person — support from the builder
  <svg key="support" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>,
  // server — Iranian hosting
  <svg key="hosting" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
    <rect x="2" y="3" width="20" height="7" rx="1" />
    <rect x="2" y="14" width="20" height="7" rx="1" />
    <path d="M6 6.5h.01M6 17.5h.01" />
  </svg>,
]

// `*` in store.heroTitle marks the accented run and `\n` a line break, so the
// headline stays translatable copy instead of JSX hardcoded per locale.
function renderHeadline(title) {
  return title.split('\n').map((line, lineIndex) => (
    <span key={lineIndex}>
      {lineIndex > 0 && <br />}
      {line.split('*').map((part, partIndex) =>
        partIndex % 2 === 1
          ? <span key={partIndex} className="text-[var(--color-accent)]">{part}</span>
          : part
      )}
    </span>
  ))
}

export default function StoreHero() {
  const { t } = useI18n()
  const [ref, visible] = useInView({ threshold: 0.08 })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const features = t('store.heroFeatures')

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
            {renderHeadline(t('store.heroTitle'))}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-[var(--color-text)]/60 max-w-xl mx-auto">
            {t('store.subtitle')}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {features.map((text, i) => (
              <div
                key={text}
                className="flex items-center gap-2"
                style={{
                  opacity: visible ? 1 : 0,
                  transition: prefersReducedMotion ? 'none' : `opacity 0.5s ease ${0.2 + i * 0.1}s`,
                }}
              >
                <span className="text-base">{featureIcons[i]}</span>
                <span className="text-sm text-[var(--color-text)]/50">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
