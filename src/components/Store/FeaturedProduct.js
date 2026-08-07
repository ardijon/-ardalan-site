'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useInView } from '@/hooks/useInView'

export default function FeaturedProduct({ product }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [ref, visible] = useInView({ threshold: 0.1 })

  if (!product) return null

  const priceDisplay = product.pricing?.pro?.priceDisplay?.[locale] || product.pricing?.pro?.priceDisplay?.en || '۰'

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <div className="relative rounded-[2rem] border border-[var(--color-accent)]/20 bg-gradient-to-br from-[var(--color-accent)]/5 via-[var(--color-bg)] to-[var(--color-tech)]/5 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-accent)]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--color-tech)]/10 rounded-full blur-3xl" />

            <div className="relative grid lg:grid-cols-2 gap-8 p-8 sm:p-12">
              <div className="relative aspect-video lg:aspect-square rounded-2xl overflow-hidden bg-[var(--color-surface)]">
                {product.screenshots?.[0] ? (
                  <Image
                    src={product.screenshots[0].src}
                    alt={product.screenshots[0].alt[locale] || product.screenshots[0].alt.en}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-8xl opacity-10">📦</span>
                  </div>
                )}

                <div className="absolute top-4 left-4">
                  <span className="px-4 py-1.5 text-xs font-bold text-white bg-yellow-500 rounded-full shadow-lg">
                    {locale === 'fa' ? '⭐ محصول ویژه' : '⭐ Featured'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {product.tech.slice(0, 4).map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 text-xs font-medium text-[var(--color-tech)] bg-[var(--color-tech)]/10 rounded-full border border-[var(--color-tech)]/20"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-[var(--color-primary)] mb-4">
                  {product.title[locale] || product.title.en}
                </h2>

                <p className="text-base text-[var(--color-text)]/60 leading-relaxed mb-6">
                  {product.description[locale] || product.description.en}
                </p>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                    <span className="text-sm font-bold text-[var(--color-text)]/60 mr-1">5.0</span>
                  </div>
                  <span className="text-sm text-[var(--color-text)]/40">
                    {locale === 'fa' ? '+۱۲۰ خریدار' : '+120 buyers'}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 mb-8">
                  <span className="text-4xl font-black text-[var(--color-accent)]">
                    {priceDisplay}
                  </span>
                  {product.pricing?.pro?.period?.[locale] && (
                    <span className="text-sm text-[var(--color-text)]/40">
                      {product.pricing.pro.period[locale]}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/store/${product.slug}`}
                    className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-bold text-white bg-[var(--color-accent)] rounded-2xl hover:bg-[var(--color-accent)]/90 active:scale-95 transition-all shadow-lg shadow-[var(--color-accent)]/20"
                  >
                    {t('store.buyNow')}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isRtl ? 'rotate-180' : ''}>
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href={product.demoUrl}
                    className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-bold text-[var(--color-text)]/70 border-2 border-[var(--color-border)] rounded-2xl hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)] active:scale-95 transition-all"
                  >
                    {t('store.viewDemo')}
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-4 text-sm text-[var(--color-text)]/40">
                  {product.features?.[locale]?.slice(0, 3).map((feature, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {feature}
                    </span>
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
