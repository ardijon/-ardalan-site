'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/I18nProvider'
import TrustSeal from './TrustSeal'

export default function Hero() {
  const { t } = useI18n()
  const [loaded, setLoaded] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    setLoaded(true)
    setIsTouchDevice('ontouchstart' in window)
  }, [])

  const handleMouseMove = useCallback((e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    el.style.setProperty('--mx', `${x}%`)
    el.style.setProperty('--my', `${y}%`)
  }, [])

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-[100dvh] flex items-center overflow-hidden pt-14 sm:pt-20 pb-8 sm:pb-8 scroll-mt-20"
      onMouseMove={isTouchDevice ? undefined : handleMouseMove}
      style={{ '--mx': '50%', '--my': '50%' }}
    >
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), var(--color-accent) 0%, transparent 60%)',
          opacity: isTouchDevice ? 0 : 0.04,
        }}
      />

      <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.05]" aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(45deg, currentColor 1px, transparent 1px),
            linear-gradient(-45deg, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-8 sm:gap-12 lg:gap-20">
          <div className="flex-1 text-center lg:text-right">
            <div
              className={`inline-block px-3 py-1 mb-4 sm:mb-6 text-[10px] sm:text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full border border-[var(--color-accent)]/20 transition-all duration-700 ${
                loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {t('hero.badge')}
            </div>

            <div
              className={`flex items-center gap-3 sm:gap-4 justify-center lg:justify-start transition-all duration-700 delay-100 ${
                loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <span className="hidden sm:block h-px w-16 bg-gradient-to-l from-[var(--color-accent)] to-transparent" />
              <h1 className="text-[clamp(2rem,8vw,6rem)] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.1] tracking-tight text-[var(--color-primary)] text-balance">
                {t('hero.name')}
              </h1>
              <span className="hidden sm:block h-px w-16 bg-gradient-to-r from-[var(--color-accent)] to-transparent" />
            </div>

            <div
              className={`mt-4 sm:mt-6 flex items-center gap-3 justify-center lg:justify-start transition-all duration-700 delay-150 ${
                loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <TrustSeal size={32} />
              <p className="text-xs sm:text-sm text-[var(--color-text)]/40 font-medium tracking-wide">
                {t('hero.subtitle')}
              </p>
            </div>

            <p
              className={`mt-4 sm:mt-6 text-base sm:text-lg lg:text-xl text-[var(--color-text)]/60 max-w-xl leading-relaxed lg:mx-0 mx-auto transition-all duration-700 delay-200 ${
                loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {t('hero.description')}
            </p>

            <div
              className={`flex flex-wrap gap-3 sm:gap-4 mt-6 sm:mt-8 justify-center lg:justify-start transition-all duration-700 delay-300 ${
                loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <a
                href="#services"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-[var(--color-accent)] text-white text-sm sm:text-base font-medium rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--color-accent)]/20 hover:shadow-xl hover:shadow-[var(--color-accent)]/30 hover:-translate-y-0.5"
              >
                {t('hero.cta1')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 border border-[var(--color-border)] text-[var(--color-text)] text-sm sm:text-base font-medium rounded-xl hover:bg-[var(--color-text)]/5 hover:border-[var(--color-accent)]/30 transition-all"
              >
                {t('hero.cta2')}
              </a>
            </div>
          </div>

          <div
            className={`flex-shrink-0 transition-all duration-1000 delay-150 ${
              loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <div className="relative w-44 h-44 sm:w-60 sm:h-60 lg:w-80 lg:h-80 xl:w-96 xl:h-96">
              <div className="absolute inset-6 rounded-full bg-black/10 dark:bg-black/30 blur-3xl" />

              <div className="absolute -inset-3 z-20 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  <circle
                    cx="100" cy="100" r="98"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="16 10"
                    className="text-[var(--color-accent)]/40"
                  />
                </svg>
              </div>

              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-gradient-to-b from-black/5 to-transparent dark:from-black/20 rounded-full" />

              <div className="relative w-full h-full rounded-full overflow-hidden ring-[6px] ring-white dark:ring-[var(--color-surface)] shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-accent)]/10 to-transparent z-10" />
                <Image
                  src="/profile.png"
                  alt={t('hero.name')}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            <div className="mt-4 sm:mt-6 flex justify-center">
              <TrustSeal size={36} />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text)]/30">
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
        </svg>
      </div>
    </section>
  )
}
