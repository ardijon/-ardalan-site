'use client'

import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'

const serviceMeta = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
      </svg>
    ),
    color: 'text-[var(--color-tech)]',
    bgColor: 'bg-[var(--color-tech)]/10',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2a4 4 0 014 4c0 2-2 3-4 5-2-2-4-3-4-5a4 4 0 014-4z" />
        <path d="M12 11v3" />
        <path d="M8 16h8" />
        <path d="M6 19h12" />
      </svg>
    ),
    color: 'text-[var(--color-accent)]',
    bgColor: 'bg-[var(--color-accent)]/10',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 20V10M18 20V4M6 20v-4" />
      </svg>
    ),
    color: 'text-[var(--color-primary)]',
    bgColor: 'bg-[var(--color-primary)]/10',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    color: 'text-[var(--color-tech)]',
    bgColor: 'bg-[var(--color-tech)]/10',
  },
]

export default function Services() {
  const { t } = useI18n()
  const [ref, visible] = useInView({ threshold: 0.08 })
  const items = t('services.items')

  return (
    <section id="services" className="py-16 sm:py-20 lg:py-28 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
              {t('services.badge')}
            </span>
            <h2 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--color-primary)]">
              {t('services.title')}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {items.map((service, i) => {
              const meta = serviceMeta[i % serviceMeta.length]
              return (
              <div
                key={service.title}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.6s ease ${i * 120}ms, transform 0.6s ease ${i * 120}ms`,
                }}
                className="group relative p-7 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${meta.bgColor} ${meta.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`} aria-hidden="true">
                  {meta.icon}
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text)] mb-2.5">
                  {service.title}
                </h3>
                <p className="text-sm text-[var(--color-text)]/50 leading-relaxed">
                  {service.desc}
                </p>
              </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
