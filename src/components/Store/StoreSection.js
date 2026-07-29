'use client'

import Link from 'next/link'
import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'
import products from '@/lib/products'

export default function StoreSection() {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [ref, visible] = useInView({ threshold: 0.08 })

  return (
    <section id="store" className="py-16 sm:py-20 lg:py-28 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
              {t('store.badge')}
            </span>
            <h2 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black text-[var(--color-primary)]">
              {t('store.title')}
            </h2>
            <p className="mt-4 text-lg text-[var(--color-text)]/60">
              {t('store.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product, i) => (
              <div
                key={product.slug}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.6s ease ${i * 120}ms, transform 0.6s ease ${i * 120}ms`,
                }}
                className={`group relative p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${isRtl ? 'text-right' : 'text-left'}`}
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>

                <h3 className="text-xl font-bold text-[var(--color-primary)] mb-2">
                  {product.title[locale] || product.title.en}
                </h3>
                <p className="text-sm text-[var(--color-text)]/60 leading-relaxed mb-4">
                  {product.shortDescription[locale] || product.shortDescription.en}
                </p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {product.tech.slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-1 text-[10px] font-medium text-[var(--color-tech)] bg-[var(--color-tech)]/10 rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/store/${product.slug}`}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 transition-colors"
                  >
                    {t('store.buyNow')}
                  </Link>
                  <Link
                    href={product.demoUrl}
                    className="px-4 py-2.5 text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-xl hover:bg-[var(--color-accent)]/10 transition-colors"
                  >
                    {t('store.viewDemo')}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/store"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-xl hover:bg-[var(--color-accent)]/10 transition-all"
            >
              {isRtl ? 'مشاهده همه محصولات' : 'View All Products'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isRtl ? 'rotate-180' : ''}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
