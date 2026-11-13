'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { toPersianDigitChars } from '@/lib/number-fa'

/**
 * The store's opening move: a cinematic product banner that spotlights each rung
 * of the ladder — توانا / سایت نماینده / رهیار — one rotating, color-signed slide
 * at a time. It replaces the old static store hero, so the first thing a buyer
 * sees is a product with a price and a CTA, not a paragraph.
 *
 * Each slide keeps the one-message / one-visual / one-CTA rule on a deep-navy
 * field, so the signature hue (amber / teal / indigo, the same hues the store
 * covers use) does the talking while white copy reads identically in BOTH themes.
 *
 * Mobile is deliberately compact: the device frame is hidden on phones and the
 * copy stacks tight, so the banner costs roughly half the vertical space it used
 * to; from `sm` up the visual returns and the two columns sit side by side.
 *
 * A client component that still server-renders slide 0 for SEO. Autoplay is one
 * requestAnimationFrame loop writing the progress bar through a ref (no per-frame
 * React state), pausing on mouse hover/focus and disabled under reduced motion.
 */

const DURATION = 6500

// Signature hues mirror the store's ProductCover art so a banner and its card
// read as the same product. `accent` is the bright tone that pops on navy (used
// for the headline word, badge, CTA, progress); `art` fills the visual frame.
const SLIDES = [
  {
    slug: 'tavana',
    href: '/store/tavana',
    status: 'available',
    accent: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.5)',
    art: 'linear-gradient(135deg, #7C2D12 0%, #B45309 45%, #D97706 100%)',
    screenshot: '/images/insurance-product/live-performance-kpi-dashboard-full.webp',
    icon: (
      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.7-3 2.9-4.5 5.5-4.5s4.8 1.5 5.5 4.5" />
        <circle cx="17" cy="9" r="2.3" />
        <path d="M16 14.6c2.3.2 3.9 1.6 4.5 4" />
      </svg>
    ),
  },
  {
    slug: 'agent-site',
    href: '/store/agent-site',
    status: 'soon',
    accent: '#2DD4BF',
    glow: 'rgba(45, 212, 191, 0.45)',
    art: 'linear-gradient(135deg, #134E4A 0%, #0F766E 45%, #0D9488 100%)',
    screenshot: null,
    icon: (
      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="11" r="2" />
        <path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 9.5h4M14 12.5h4M14 15.5h2.5" />
      </svg>
    ),
  },
  {
    slug: 'rahyar',
    href: '/store/rahyar',
    status: 'org',
    accent: '#818CF8',
    glow: 'rgba(129, 140, 248, 0.45)',
    art: 'linear-gradient(135deg, #312E81 0%, #3730A3 45%, #4338CA 100%)',
    screenshot: null,
    icon: (
      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
        <path d="M9 10h.01M12 10h.01M15 10h.01M9 13.5h.01M12 13.5h.01M15 13.5h.01" />
      </svg>
    ),
  },
]

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")"

export default function HeroBanner() {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const n = SLIDES.length

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hover, setHover] = useState(false)
  const [focused, setFocused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [mounted, setMounted] = useState(false)

  const progressRef = useRef(0)
  const barRef = useRef(null)
  const stageRef = useRef(null)
  const touchX = useRef(null)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const playing = mounted && !paused && !hover && !focused && !reduced

  const paintBar = useCallback((v) => {
    if (barRef.current) barRef.current.style.transform = `scaleX(${v})`
  }, [])

  const go = useCallback((i) => {
    progressRef.current = 0
    paintBar(0)
    setIndex(((i % n) + n) % n)
  }, [n, paintBar])

  const next = useCallback(() => go(index + 1), [go, index])
  const prev = useCallback(() => go(index - 1), [go, index])

  // One rAF loop drives both the progress bar and the advance. It writes the bar
  // through a ref so a 60fps progress sweep never re-renders React; only the
  // slide change does. Pausing (hover/focus/toggle) cancels the loop and keeps
  // progressRef, so resuming continues from the exact same spot.
  useEffect(() => {
    if (!playing) return undefined
    let raf
    let last = performance.now()
    const tick = (now) => {
      progressRef.current = Math.min(1, progressRef.current + (now - last) / DURATION)
      last = now
      paintBar(progressRef.current)
      if (progressRef.current >= 1) {
        progressRef.current = 0
        setIndex((i) => (i + 1) % n)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, n, paintBar])

  const slide = SLIDES[index]
  const copy = (key) => t(`heroBanner.slides.${slide.slug}.${key}`)
  const num = (v) => (locale === 'fa' ? toPersianDigitChars(String(v)) : String(v))

  const onKeyDown = (e) => {
    // Arrows follow reading direction: in RTL, Left advances, Right goes back.
    if (e.key === 'ArrowRight') { e.preventDefault(); isRtl ? prev() : next() }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); isRtl ? next() : prev() }
    else if (e.key === 'Home') { e.preventDefault(); go(0) }
    else if (e.key === 'End') { e.preventDefault(); go(n - 1) }
  }

  // Hover pauses autoplay and lights the cursor glow — but only for a real
  // mouse. A touch tap fires a pointerenter with no matching leave, which would
  // otherwise leave autoplay stuck paused after the first tap.
  const onPointerEnter = (e) => { if (e.pointerType === 'mouse') setHover(true) }
  const onPointerLeave = (e) => { if (e.pointerType === 'mouse') setHover(false) }

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 48) return
    // Swipe toward the start edge advances in both directions.
    const forward = isRtl ? dx > 0 : dx < 0
    forward ? next() : prev()
  }

  const onStageMove = (e) => {
    if (reduced || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    stageRef.current.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    stageRef.current.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  const liveText = `${copy('name')} — ${t('heroBanner.slideOf').replace('{i}', num(index + 1)).replace('{n}', num(n))}`

  return (
    <section id="store-banner" className="relative pt-24 sm:pt-28 pb-10 sm:pb-14 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* The stage. Always deep-navy so white copy and the signature hue read
            identically in light and dark; the header above sits on the page bg. */}
        <div
          ref={stageRef}
          role="region"
          aria-roledescription="carousel"
          aria-label={t('heroBanner.regionLabel')}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onFocus={() => setFocused(true)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseMove={onStageMove}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0B1120] shadow-2xl outline-none min-h-[300px] sm:min-h-[380px] lg:min-h-[460px] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          style={{ '--mx': '70%', '--my': '30%' }}
        >
          {/* Layered field: multi-stop navy base, per-slide aurora crossfade,
              girih lattice, grain, and a cursor-following glow. */}
          <div className="absolute inset-0" aria-hidden="true" style={{ background: 'linear-gradient(135deg, #0B1120 0%, #101B33 48%, #0B1120 100%)' }} />
          {SLIDES.map((s, i) => (
            <div
              key={s.slug}
              aria-hidden="true"
              className="hero-aurora absolute inset-0 transition-opacity duration-700"
              style={{
                opacity: i === index ? 1 : 0,
                background: `radial-gradient(60% 80% at ${isRtl ? '18% 25%' : '82% 25%'}, ${s.glow} 0%, transparent 65%)`,
              }}
            />
          ))}
          <svg className="absolute inset-0 h-full w-full opacity-[0.05]" aria-hidden="true">
            <defs>
              <pattern id="hero-girih" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <path d="M17 0L34 17L17 34L0 17Z" fill="none" stroke="#fff" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-girih)" />
          </svg>
          <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" aria-hidden="true" style={{ backgroundImage: GRAIN }} />
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            aria-hidden="true"
            style={{ background: 'radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,0.10) 0%, transparent 45%)', opacity: hover && !reduced ? 1 : 0 }}
          />

          {/* Active slide. Keyed by index so the entrance choreography replays on
              every change; only the active slide is in the DOM, so nothing hidden
              is focusable. */}
          <div
            key={slide.slug}
            className="relative z-10 flex min-h-[300px] sm:min-h-[380px] lg:min-h-[460px] flex-col sm:flex-row items-center gap-5 sm:gap-8 lg:gap-12 px-5 sm:px-8 lg:px-14 pt-6 sm:pt-8 pb-16"
            role="group"
            aria-roledescription="slide"
            aria-label={liveText}
          >
            {/* Copy block — reading-order first, so it lands on the right in RTL. */}
            <div className="flex-1 text-center sm:text-start">
              <div className="hero-enter mb-3 sm:mb-4 flex flex-wrap items-center justify-center sm:justify-start gap-2" style={{ animationDelay: '0ms' }}>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] sm:text-xs font-bold"
                  style={{ color: slide.accent, backgroundColor: `${slide.accent}1F`, border: `1px solid ${slide.accent}55` }}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-75 hero-ping" style={{ backgroundColor: slide.accent }} />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: slide.accent }} />
                  </span>
                  {copy('badge')}
                </span>
              </div>

              <p className="hero-enter mb-2 sm:mb-3 text-[11px] sm:text-sm font-bold uppercase tracking-widest text-white/50" style={{ animationDelay: '60ms' }}>
                {copy('audience')}
              </p>

              <h1 className="hero-enter font-display text-[clamp(1.4rem,5vw,3.4rem)] font-black leading-[1.15] tracking-tight text-white text-balance" style={{ animationDelay: '120ms' }}>
                {copy('headline')}{' '}
                <span style={{ color: slide.accent }}>{copy('accent')}</span>
              </h1>

              <p className="hero-enter mx-auto sm:mx-0 mt-3 sm:mt-4 max-w-xl text-sm sm:text-base lg:text-lg leading-relaxed text-white/70 line-clamp-2 sm:line-clamp-none" style={{ animationDelay: '200ms' }}>
                {copy('sub')}
              </p>

              <p className="hero-enter mt-4 hidden sm:flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-white/60" style={{ animationDelay: '260ms' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={slide.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
                {copy('proof')}
              </p>

              <div className="hero-enter mt-5 sm:mt-7 flex justify-center sm:justify-start" style={{ animationDelay: '320ms' }}>
                <Link
                  href={slide.href}
                  className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm sm:text-base font-black shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
                  style={{ backgroundColor: slide.accent, color: '#0B1120', boxShadow: `0 10px 30px -8px ${slide.glow}` }}
                >
                  {copy('cta')}
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform group-hover:translate-x-0.5 ${isRtl ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Visual block — device frame with the real screenshot (توانا) or
                brand art (the two coming-soon products), plus a floating proof chip. */}
            <div className="hero-enter relative hidden w-full max-w-md sm:block sm:max-w-none sm:flex-1" style={{ animationDelay: '180ms' }}>
              <div className="absolute -inset-6 rounded-full blur-3xl opacity-40" aria-hidden="true" style={{ background: slide.glow }} />
              <div className="relative rounded-2xl border border-white/15 bg-white/5 shadow-2xl backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                  <span className="ms-3 flex h-6 flex-1 items-center gap-1.5 truncate rounded-md bg-white/10 px-2.5 text-[11px] text-white/50">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <bdi>{copy('name')}</bdi>
                  </span>
                </div>
                <div className="relative aspect-[16/10] overflow-hidden">
                  {slide.screenshot ? (
                    <Image
                      src={slide.screenshot}
                      alt={copy('sub')}
                      fill
                      unoptimized
                      sizes="(max-width: 1024px) 90vw, 44vw"
                      className="hero-kenburns object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: slide.art }}>
                      <svg className="absolute inset-0 h-full w-full opacity-[0.14]" aria-hidden="true">
                        <defs>
                          <pattern id={`hero-art-${slide.slug}`} width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <path d="M13 0L26 13L13 26L0 13Z" fill="none" stroke="#fff" strokeWidth="1" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#hero-art-${slide.slug})`} />
                      </svg>
                      <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-sm">
                        {slide.icon}
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" aria-hidden="true" />
                </div>
              </div>

              {/* Floating proof chip. */}
              <div className="hero-float absolute -bottom-5 start-2 sm:start-6 z-10 hidden lg:block">
                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0F172A]/90 px-4 py-3 shadow-xl backdrop-blur">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${slide.accent}22`, color: slide.accent }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 3v18h18" />
                      <path d="M7 14l4-4 3 3 5-6" />
                    </svg>
                  </span>
                  <span className="text-start">
                    <span className="block text-[10px] uppercase tracking-wide text-white/50">{copy('metric')}</span>
                    <span className="block text-base font-black leading-tight" style={{ color: slide.accent }}>{copy('metricValue')}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls: product-name pills double as a mini ladder nav, plus
              arrows, an autoplay toggle, and a progress sweep in the active hue. */}
          <div className="absolute inset-x-0 bottom-0 z-20">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 pb-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {SLIDES.map((s, i) => (
                  <button
                    key={s.slug}
                    type="button"
                    aria-current={i === index ? 'true' : undefined}
                    aria-label={`${t('heroBanner.goto')} ${i + 1}: ${t(`heroBanner.slides.${s.slug}.name`)}`}
                    onClick={() => go(i)}
                    className={`rounded-full px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-bold transition-all duration-300 ${i === index ? 'text-[#0B1120]' : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10'}`}
                    style={i === index ? { backgroundColor: s.accent } : undefined}
                  >
                    {t(`heroBanner.slides.${s.slug}.name`)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button type="button" onClick={prev} aria-label={t('heroBanner.prev')} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={isRtl ? 'rotate-180' : ''}>
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? t('heroBanner.play') : t('heroBanner.pause')} aria-pressed={paused} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                  {paused ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                  )}
                </button>
                <button type="button" onClick={next} aria-label={t('heroBanner.next')} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={isRtl ? 'rotate-180' : ''}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-0.5 w-full bg-white/10" aria-hidden="true">
              <div ref={barRef} className="h-full w-full" style={{ backgroundColor: slide.accent, transform: 'scaleX(0)', transformOrigin: isRtl ? 'right' : 'left' }} />
            </div>
          </div>

          {/* Screen-reader announcement of the current slide. */}
          <span className="sr-only" aria-live="polite">{liveText}</span>
        </div>
      </div>
    </section>
  )
}