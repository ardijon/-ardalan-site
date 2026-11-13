'use client'

import { useId } from 'react'
import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'

/**
 * A full-bleed navy value-proposition band.
 *
 * The page is otherwise cream surface after cream surface; this is the deliberate
 * high-contrast beat that breaks the monotony (the reference site uses the same
 * device). It is always navy — like a pull-quote panel, it does not flip with the
 * theme — with amber and teal glows borrowing the brand palette, a faint girih
 * lattice for depth, and one ghost CTA that turns the statement into a contact.
 */
export default function ValueBand() {
  const { t, dir } = useI18n()
  const isRtl = dir === 'rtl'
  const [ref, visible] = useInView({ threshold: 0.2 })
  const patternId = useId()

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-16 sm:py-20"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #0B1120 100%)' }}
    >
      <svg className="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
        <defs>
          <pattern id={patternId} width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M16 0L32 16L16 32L0 16Z" fill="none" stroke="#fff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      <div className="absolute -top-24 start-1/4 h-72 w-72 rounded-full bg-[#D97706]/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-24 end-1/4 h-72 w-72 rounded-full bg-[#0D9488]/20 blur-3xl" aria-hidden="true" />

      <div
        className="relative mx-auto max-w-3xl px-5 text-center sm:px-6"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-6 text-[#F59E0B]" aria-hidden="true">
          <path d="M9.5 8C7 8 5 10 5 12.5c0 2.2 1.6 4 3.8 4 .3 0 .6 0 .9-.1-.5 1.3-1.5 2.3-2.9 3l1.2 1.6c2.9-1.4 4.8-4 4.8-7.3C12.8 10 11.4 8 9.5 8zm9 0C16 8 14 10 14 12.5c0 2.2 1.6 4 3.8 4 .3 0 .6 0 .9-.1-.5 1.3-1.5 2.3-2.9 3l1.2 1.6c2.9-1.4 4.8-4 4.8-7.3C21.8 10 20.4 8 18.5 8z" />
        </svg>

        <blockquote className="text-balance text-[clamp(1.4rem,3.5vw,2.1rem)] font-bold leading-relaxed text-white">
          {t('valueBand.quote')}
        </blockquote>

        <div className="mt-7 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-[#F59E0B]/60" aria-hidden="true" />
          <p className="text-sm font-bold text-[#F59E0B]">{t('hero.name')}</p>
          <span className="h-px w-8 bg-[#F59E0B]/60" aria-hidden="true" />
        </div>
        <p className="mt-1 text-xs text-white/60">{t('valueBand.role')}</p>

        <a
          href="#contact"
          className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
        >
          {t('hero.cta2')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={isRtl ? 'rotate-180' : ''}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </section>
  )
}