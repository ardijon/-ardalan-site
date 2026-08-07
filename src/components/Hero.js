'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function Hero() {
  const { t, dir } = useI18n()
  const isRtl = dir === 'rtl'
  const [loaded, setLoaded] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    setLoaded(true)
    setIsTouchDevice('ontouchstart' in window)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (isTouchDevice) return
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    el.style.setProperty('--mx', `${x}%`)
    el.style.setProperty('--my', `${y}%`)
  }, [isTouchDevice])

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-[100dvh] flex items-center pt-14 sm:pt-20 pb-8 sm:pb-8 scroll-mt-20"
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
          <div className={`flex-1 text-center ${isRtl ? 'lg:text-right' : 'lg:text-left'}`}>
            <div
              className={`inline-block px-3 py-1 mb-4 sm:mb-6 text-[10px] sm:text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full border border-[var(--color-accent)]/20 transition-all duration-700 ${
                loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {t('hero.badge')}
            </div>

            <div
              className={`flex items-center gap-3 sm:gap-4 justify-center ${isRtl ? 'lg:justify-start' : 'lg:justify-end'} transition-all duration-700 delay-100 ${
                loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <span className="hidden sm:block h-px w-16 bg-gradient-to-l from-[var(--color-accent)] to-transparent" />
              <h1 className="text-[clamp(2rem,8vw,6rem)] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.1] tracking-tight text-balance bg-gradient-to-l from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-primary)] bg-clip-text text-transparent drop-shadow-lg">
                {t('hero.name')}
              </h1>
              <span className="hidden sm:block h-px w-16 bg-gradient-to-r from-[var(--color-accent)] to-transparent" />
            </div>

            <div
              className={`mt-2 sm:mt-3 flex items-center gap-3 justify-center ${isRtl ? 'lg:justify-start' : 'lg:justify-end'} transition-all duration-700 delay-150 ${
                loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <p className="text-xs sm:text-sm text-[var(--color-text)]/60 font-medium tracking-wide">
                {t('hero.subtitle')}
              </p>
            </div>

            <p
              className={`mt-4 sm:mt-6 text-base sm:text-lg lg:text-xl text-[var(--color-text)]/60 max-w-xl leading-relaxed ${isRtl ? 'lg:mx-0' : 'lg:mr-0 lg:ml-auto'} mx-auto transition-all duration-700 delay-200 ${
                loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {t('hero.description')}
            </p>

            <div
              className={`flex flex-wrap gap-3 mt-6 sm:mt-8 justify-center ${isRtl ? 'lg:justify-start' : 'lg:justify-end'} transition-all duration-700 delay-300 ${
                loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <a
                href="#services"
                className="group inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-l from-[var(--color-accent)] to-amber-600 text-white text-sm sm:text-base font-medium rounded-xl shadow-lg shadow-[var(--color-accent)]/20 hover:shadow-xl hover:shadow-[var(--color-accent)]/40 hover:-translate-y-1 hover:scale-105 transition-all duration-300"
              >
                {t('hero.cta1')}
                <svg className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="#contact"
                className="group inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 border-2 border-[var(--color-border)] text-[var(--color-text)] text-sm sm:text-base font-medium rounded-xl hover:bg-[var(--color-accent)]/10 hover:border-[var(--color-accent)]/50 hover:-translate-y-1 transition-all duration-300"
              >
                {t('hero.cta2')}
                <svg className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 rtl:rotate-180 rtl:translate-x-2 rtl:group-hover:-translate-x-0 transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          <div
            className={`flex-shrink-0 transition-all duration-1000 delay-150 ${
              loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <div
              className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 group"
            >
              {/* دوخت چرم - حلقه ظریف */}
              <div className="absolute -inset-1 sm:-inset-1.5 pointer-events-none z-20">
                <svg className="w-full h-full" viewBox="0 0 200 200" overflow="visible">
                  <defs>
                    <filter id="leather-shadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="0.5" stdDeviation="0.5" floodColor="#8B4513" floodOpacity="0.3"/>
                    </filter>
                  </defs>
                  {/* دوخت ظریف روی حلقه سفید */}
                  <circle
                    cx="100" cy="100" r="99"
                    fill="none"
                    stroke="#8B4513"
                    strokeWidth="1.5"
                    strokeDasharray="8 4"
                    strokeLinecap="round"
                    filter="url(#leather-shadow)"
                    className="dark:stroke-amber-600"
                  />
                </svg>
              </div>

              {/* پس‌زمینه درخشان ملایم */}
              <div className="absolute inset-4 rounded-full bg-[var(--color-accent)]/10 dark:bg-[var(--color-accent)]/15 blur-2xl group-hover:bg-[var(--color-accent)]/20 transition-all duration-700" />

              {/* تصویر پروفایل */}
              <div className="relative w-full h-full rounded-full overflow-hidden ring-[6px] ring-white dark:ring-[var(--color-surface)] shadow-2xl group-hover:shadow-[0_0_40px_rgba(217,119,6,0.2)] transition-all duration-500 z-10">
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-accent)]/10 via-transparent to-[var(--color-tech)]/10 z-10 group-hover:from-[var(--color-accent)]/20 group-hover:to-[var(--color-tech)]/20 transition-all duration-500" />
                <Image
                  src="/profile.png"
                  alt={t('hero.name')}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  priority
                />
              </div>
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
