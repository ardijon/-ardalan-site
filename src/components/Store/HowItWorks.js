'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'
import { useInView } from '@/hooks/useInView'

const steps = [
  {
    num: '۱',
    numEn: '01',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    key: 'browse',
  },
  {
    num: '۲',
    numEn: '02',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    key: 'purchase',
  },
  {
    num: '۳',
    numEn: '03',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    key: 'download',
  },
]

export default function HowItWorks() {
  const { t, locale } = useI18n()
  const [ref, visible] = useInView({ threshold: 0.1 })

  return (
    <section id="how-it-works" className="py-16 sm:py-24 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block px-4 py-1.5 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full border border-[var(--color-accent)]/20">
              {locale === 'fa' ? 'نحوه خرید' : 'HOW IT WORKS'}
            </span>
            <h2 className="mt-6 text-3xl sm:text-4xl font-black text-[var(--color-primary)]">
              {locale === 'fa'
                ? 'در ۳ مرحله ساده خرید کنید'
                : 'Buy in 3 Simple Steps'}
            </h2>
          </div>

          <div className="relative grid md:grid-cols-3 gap-8 md:gap-4">
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-[var(--color-accent)]/20 via-[var(--color-accent)]/40 to-[var(--color-accent)]/20" />

            {steps.map((step, i) => (
              <div
                key={step.key}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.6s ease ${0.3 + i * 0.15}s, transform 0.6s ease ${0.3 + i * 0.15}s`,
                }}
                className="relative text-center"
              >
                <div className="relative inline-flex mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center relative z-10">
                    {step.icon}
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-sm font-black z-20">
                    {locale === 'fa' ? step.num : step.numEn}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-[var(--color-primary)] mb-2">
                  {t(`howItWorks.${step.key}.title`)}
                </h3>
                <p className="text-sm text-[var(--color-text)]/50 leading-relaxed max-w-xs mx-auto">
                  {t(`howItWorks.${step.key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
