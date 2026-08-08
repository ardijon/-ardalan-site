'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'
import { useInView } from '@/hooks/useInView'

export default function StoreHero() {
  const { t, locale } = useI18n()
  const [ref, visible] = useInView({ threshold: 0.08 })

  const features = [
    { icon: '⚡', text: locale === 'fa' ? 'تحویل فوری' : 'Instant Delivery' },
    { icon: '🔧', text: locale === 'fa' ? 'کد قابل ویرایش' : 'Editable Code' },
    { icon: '🛡️', text: locale === 'fa' ? 'ضمانت ۷ روزه' : '7-Day Guarantee' },
  ]

  return (
    <section className="relative pt-32 sm:pt-36 lg:pt-44 pb-16 sm:pb-20 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-[var(--color-accent)]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[var(--color-tech)]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-[var(--color-accent)]/3 to-transparent rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className="text-center max-w-4xl mx-auto"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full border border-[var(--color-accent)]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            {t('store.badge')}
          </span>

          <h1 className="mt-8 text-4xl sm:text-5xl lg:text-7xl font-black text-[var(--color-primary)] leading-tight">
            {locale === 'fa' ? (
              <>
                قالب‌های <span className="text-[var(--color-accent)]">حرفه‌ای</span>
                <br />
                برای شروع <span className="text-[var(--color-accent)]">سریع</span>
              </>
            ) : (
              <>
                Professional <span className="text-[var(--color-accent)]">Templates</span>
                <br />
                for a <span className="text-[var(--color-accent)]">Quick</span> Start
              </>
            )}
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[var(--color-text)]/60 max-w-2xl mx-auto leading-relaxed">
            {t('store.subtitle')}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#products"
              className="group inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white bg-[var(--color-accent)] rounded-2xl hover:bg-[var(--color-accent)]/90 active:scale-95 transition-all shadow-lg shadow-[var(--color-accent)]/20"
            >
              {locale === 'fa' ? 'مشاهده محصولات' : 'View Products'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-transform`}>
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-[var(--color-text)]/70 border-2 border-[var(--color-border)] rounded-2xl hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)] active:scale-95 transition-all"
            >
              {locale === 'fa' ? 'نحوه خرید' : 'How to Buy'}
            </a>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.6s ease ${0.3 + i * 0.15}s, transform 0.6s ease ${0.3 + i * 0.15}s`,
                }}
              >
                <span className="text-lg">{feature.icon}</span>
                <span className="text-sm font-medium text-[var(--color-text)]/60">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Product Preview Mockup */}
          <div
            className="mt-16 mx-auto max-w-3xl"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(40px)',
              transition: 'opacity 1s ease 0.5s, transform 1s ease 0.5s',
            }}
          >
            <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-[var(--color-accent)]/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-[var(--color-text)]/30 font-mono">ai2apps.sbs/store</span>
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <div className="grid sm:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
                      <div className="h-24 bg-gradient-to-br from-[var(--color-accent)]/10 to-[var(--color-tech)]/10" />
                      <div className="p-3 space-y-2">
                        <div className="h-2.5 bg-[var(--color-text)]/10 rounded-full w-3/4" />
                        <div className="h-2 bg-[var(--color-text)]/5 rounded-full w-1/2" />
                        <div className="flex items-center justify-between pt-2">
                          <div className="h-3 bg-[var(--color-accent)]/20 rounded-full w-16" />
                          <div className="h-6 bg-[var(--color-accent)]/80 rounded-lg w-14" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}
