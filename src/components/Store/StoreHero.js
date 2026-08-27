'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'
import { useInView } from '@/hooks/useInView'
import { useEffect, useState, useRef, useCallback } from 'react'

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
          ? <span key={partIndex} className="store-hero-gradient">{part}</span>
          : part
      )}
    </span>
  ))
}

/**
 * Honeycomb grid + glow that follows the mouse inside the hero box.
 * All DOM work happens outside React to avoid re-renders.
 * breathing, fade-out, variable size/opacity, and a soft glow are all
 * handled via CSS transitions and a single requestAnimationFrame loop.
 */
function HexagonParticles({ containerRef }) {
  const stateRef = useRef({ cells: [], glow: null, wrapper: null, raf: 0, mouseX: -999, mouseY: -999, inside: false })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const s = stateRef.current

    // Wrapper for hexagons
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden;opacity:0;transition:opacity 0.6s ease'
    container.appendChild(wrapper)
    s.wrapper = wrapper

    // Glow element
    const glow = document.createElement('div')
    glow.style.cssText = 'position:absolute;width:220px;height:220px;border-radius:50%;pointer-events:none;z-index:0;opacity:0;transition:opacity 0.6s ease;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(245,158,11,0.10) 0%,rgba(245,158,11,0.03) 50%,transparent 100%);will-change:transform'
    container.appendChild(glow)
    s.glow = glow

    // Build hex grid: 50+ cells within ~80px radius
    const hexSize = 12
    const rowH = hexSize * 1.55
    const colW = hexSize * 1.78
    const radius = 80

    const cells = []
    for (let row = -9; row <= 9; row++) {
      const offset = row % 2 === 0 ? 0 : colW / 2
      for (let col = -7; col <= 7; col++) {
        const dx = col * colW + offset
        const dy = row * rowH
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > radius) continue

        const ratio = dist / radius
        const opacity = 0.18 * (1 - ratio * 0.75)
        const scale = 0.65 + (1 - ratio) * 0.35
        const rotate = Math.random() * 360
        const breathePhase = Math.random() * Math.PI * 2
        const breatheSpeed = 0.0008 + Math.random() * 0.0006

        const el = document.createElement('div')
        el.style.cssText = `
          position:absolute; pointer-events:none;
          width:${hexSize}px; height:${hexSize}px;
          clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
          background:rgba(245,158,11,${opacity});
          will-change:transform;
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), opacity 0.6s ease;
          transform: scale(${scale}) rotate(${rotate}deg);
        `
        wrapper.appendChild(el)
        cells.push({ el, dx, dy, scale, rotate, breathePhase, breatheSpeed })
      }
    }
    s.cells = cells

    // Animation loop for breathing
    let lastTime = 0
    const animate = (time) => {
      if (time - lastTime > 50) { // ~20fps for breathing — enough for subtle motion
        lastTime = time
        for (const c of cells) {
          const breathe = Math.sin(time * c.breatheSpeed + c.breathePhase) * 2
          c.el.style.transform = `translate(${s.mouseX + c.dx}px, ${s.mouseY + c.dy + breathe}px) scale(${c.scale}) rotate(${c.rotate + time * 0.008}deg)`
        }
      }
      s.raf = requestAnimationFrame(animate)
    }

    let throttleTimer = null
    const onMove = (e) => {
      const rect = container.getBoundingClientRect()
      s.mouseX = e.clientX - rect.left
      s.mouseY = e.clientY - rect.top
      s.inside = true

      if (!throttleTimer) {
        throttleTimer = setTimeout(() => { throttleTimer = null }, 16)
        wrapper.style.opacity = '1'
        glow.style.opacity = '1'
        glow.style.left = s.mouseX + 'px'
        glow.style.top = s.mouseY + 'px'
        for (const c of cells) {
          const breathe = Math.sin(performance.now() * c.breatheSpeed + c.breathePhase) * 2
          c.el.style.transform = `translate(${s.mouseX + c.dx}px, ${s.mouseY + c.dy + breathe}px) scale(${c.scale}) rotate(${c.rotate}deg)`
        }
      }
    }

    const onLeave = () => {
      s.inside = false
      wrapper.style.opacity = '0'
      glow.style.opacity = '0'
    }

    s.raf = requestAnimationFrame(animate)
    container.addEventListener('mousemove', onMove, { passive: true })
    container.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(s.raf)
      container.removeEventListener('mousemove', onMove)
      container.removeEventListener('mouseleave', onLeave)
      wrapper.remove()
      glow.remove()
    }
  }, [containerRef])

  return null
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
  const boxRef = useRef(null)

  return (
    <section className="relative pt-32 sm:pt-36 pb-12 sm:pb-16 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-[var(--color-accent)]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[var(--color-tech)]/5 rounded-full blur-3xl" />
      </div>

      <div ref={boxRef} className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 store-hero-box overflow-hidden relative">
        <HexagonParticles containerRef={boxRef} />
        <div
          ref={ref}
          className="text-center max-w-3xl mx-auto"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: prefersReducedMotion ? 'none' : 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <h1 className="text-[clamp(1.5rem,4vw,2.75rem)] font-black leading-loose whitespace-nowrap store-hero-shimmer">
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
