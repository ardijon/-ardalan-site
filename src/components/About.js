'use client'

import { useState, useEffect } from 'react'
import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'
import AnimatedCounter from './AnimatedCounter'
import TrustSeal from './TrustSeal'
import { escapeHtml } from '@/lib/markdown'

function renderBold(text) {
  const escaped = escapeHtml(text)
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-text)]">$1</strong>')
}

function StatCard({ stat, visible, index }) {
  const [hover, setHover] = useState(false)
  const transitionDelay = 200 + index * 150
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.7s ease ${transitionDelay}ms, transform 0.7s ease ${transitionDelay}ms`,
      }}
      className="group relative p-8 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm hover:shadow-xl hover:shadow-[var(--color-accent)]/5 hover:-translate-y-2 hover:border-[var(--color-accent)]/25 transition-all duration-500 ease-out overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.2)] to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-500"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, var(--color-accent) 0%, transparent 70%), radial-gradient(circle at 70% 70%, var(--color-tech) 0%, transparent 70%)',
        }}
      />
      <p className="text-3xl sm:text-4xl font-black text-[var(--color-accent)] group-hover:scale-110 transition-transform duration-500 origin-center">
        {visible ? (
          <AnimatedCounter value={stat.num} suffix={stat.suffix} duration={hover ? 800 : 2000} />
        ) : (
          '۰' + stat.suffix
        )}
      </p>
      <p className="mt-2 text-sm text-[var(--color-text)]/50 font-medium group-hover:text-[var(--color-text)]/70 transition-colors duration-500">
        {stat.label}
      </p>
    </div>
  )
}

export default function About() {
  const { t, dir } = useI18n()
  const isRtl = dir === 'rtl'
  const [ref, visible] = useInView({ threshold: 0.1 })
  const titleText = t('about.title')
  const [charIndex, setCharIndex] = useState(0)
  const [typingDone, setTypingDone] = useState(false)
  const stats = t('about.stats')

  useEffect(() => {
    if (!visible || typingDone) return
    setCharIndex(0)
    const interval = setInterval(() => {
      setCharIndex(prev => {
        const next = prev + 1
        if (next >= titleText.length) {
          clearInterval(interval)
          setTypingDone(true)
        }
        return next
      })
    }, 100)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, typingDone])

  return (
    <section id="about" className="py-16 sm:py-20 lg:py-28 bg-[var(--color-surface)]/50 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className="grid lg:grid-cols-2 gap-10 sm:gap-16 items-center"
        >
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            <h2 className="text-[clamp(1.8rem,5.5vw,4.5rem)] font-black text-[var(--color-primary)] leading-tight min-h-[1.2em]">
              <span>
                {visible ? titleText.slice(0, charIndex) : ''}
                {!typingDone && visible && <span className="animate-pulse text-[var(--color-accent)]">|</span>}
              </span>
            </h2>
            <div className="flex items-center gap-3 mt-6 mb-6">
              <div className="w-16 h-1 bg-[var(--color-accent)] rounded-full" />
              <TrustSeal size={28} />
            </div>

            <div className="space-y-5 text-[var(--color-text)]/60 leading-relaxed md:text-justify">
              <p dangerouslySetInnerHTML={{ __html: renderBold(t('about.p1')) }} />
              <p>{t('about.p2')}</p>
              <p dangerouslySetInnerHTML={{ __html: renderBold(t('about.p3')) }} />
              <div className={`relative pt-2 ${
                isRtl ? 'pr-6 sm:pr-8 border-r-2' : 'pl-6 sm:pl-8 border-l-2'
              } border-[var(--color-accent)]/30`}>
                <p className="text-lg sm:text-xl leading-relaxed text-[var(--color-text)]/70" dangerouslySetInnerHTML={{ __html: renderBold(t('about.quote')) }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map((stat, i) => (
              <StatCard key={stat.label} stat={stat} visible={visible} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
