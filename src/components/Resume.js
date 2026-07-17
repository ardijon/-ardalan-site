'use client'

import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function Resume() {
  const { t } = useI18n()
  const [ref, visible] = useInView({ threshold: 0.08 })
  const experiences = t('resume.items')

  return (
    <section id="resume" className="py-16 sm:py-20 lg:py-28 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
              {t('resume.badge')}
            </span>
            <h2 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black text-[var(--color-primary)]">
              {t('resume.title')}
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            {experiences.map((exp, i) => (
              <div
                key={exp.year}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateX(0)' : 'translateX(16px)',
                  transition: `opacity 0.6s ease ${i * 120}ms, transform 0.6s ease ${i * 120}ms`,
                }}
                className="relative flex gap-4 sm:gap-8 pb-8 sm:pb-10 last:pb-0 group"
              >
                {i < experiences.length - 1 && (
                  <div className="absolute right-[15px] sm:right-[19px] top-9 sm:top-10 bottom-0 w-px bg-[var(--color-border)]" />
                )}

                <div className="flex flex-col items-center">
                  <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-[var(--color-bg)] dark:bg-[var(--color-card)] border-2 border-[var(--color-accent)]/30 flex items-center justify-center text-[10px] sm:text-xs font-bold text-[var(--color-accent)] shrink-0 group-hover:border-[var(--color-accent)] group-hover:scale-110 transition-all duration-300">
                    {i + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0 pt-1.5">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded">
                    {exp.year}
                  </span>
                  <h3 className="mt-2 text-lg sm:text-xl font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
                    {exp.title}
                  </h3>
                  {exp.subtitle && (
                    <p className="mt-1 text-xs text-[var(--color-accent)]/70 font-medium">
                      {exp.subtitle}
                    </p>
                  )}
                  <p className="mt-0.5 text-sm text-[var(--color-text)]/50">
                    {exp.org}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
