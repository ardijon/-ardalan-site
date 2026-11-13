'use client'

import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'
import AnimatedCounter from './AnimatedCounter'
import { escapeHtml } from '@/lib/markdown'

function renderBold(text) {
  const escaped = escapeHtml(text)
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--color-text)]">$1</strong>')
}

function StatCard({ stat, visible, index }) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.5s ease ${index * 60}ms, transform 0.5s ease ${index * 60}ms`,
      }}
      className="p-4 sm:p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm hover:border-accent-soft-25 hover:shadow-md transition-all duration-300 text-center"
    >
      <p className="text-2xl sm:text-3xl font-black text-[var(--color-accent)]">
        {visible && <AnimatedCounter value={stat.num} suffix={stat.suffix} duration={1500} />}
      </p>
      <p className="mt-1.5 text-xs text-text-soft-50 font-medium">
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
  const stats = t('about.stats')

  return (
    <section id="about" className="py-16 sm:py-20 lg:py-28 bg-surface-soft scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-black text-[var(--color-primary)] leading-tight text-balance">
              {titleText}
            </h2>
            <div className="w-16 h-1 bg-[var(--color-accent)] rounded-full mt-6 mb-10" />

          <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 items-start">
            <div className="space-y-5 text-base sm:text-lg text-text-soft-60 leading-relaxed md:text-justify">
              <p dangerouslySetInnerHTML={{ __html: renderBold(t('about.p1')) }} />
              <p>{t('about.p2')}</p>
              <p dangerouslySetInnerHTML={{ __html: renderBold(t('about.p3')) }} />
              <div className={`relative pt-2 ${
                isRtl ? 'pr-6 sm:pr-8 border-r-2' : 'pl-6 sm:pl-8 border-l-2'
              } border-accent-soft-30`}>
                <p className="text-lg sm:text-xl leading-relaxed text-text-soft-70" dangerouslySetInnerHTML={{ __html: renderBold(t('about.quote')) }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat, i) => (
                <StatCard key={stat.label} stat={stat} visible={visible} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
