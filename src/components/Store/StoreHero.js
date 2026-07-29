'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'
import { useInView } from '@/hooks/useInView'

export default function StoreHero() {
  const { t } = useI18n()
  const [ref, visible] = useInView({ threshold: 0.08 })

  return (
    <section className="pt-32 sm:pt-36 lg:pt-44 pb-16 sm:pb-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className="text-center max-w-3xl mx-auto"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
            {t('store.badge')}
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--color-primary)]">
            {t('store.title')}
          </h1>
          <p className="mt-4 text-lg text-[var(--color-text)]/60 max-w-xl mx-auto">
            {t('store.subtitle')}
          </p>
        </div>
      </div>
    </section>
  )
}
