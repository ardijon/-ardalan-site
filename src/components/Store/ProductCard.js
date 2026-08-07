'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function ProductCard({ product, featured = false }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  const price = product.pricing?.pro?.price || 0
  const priceDisplay = product.pricing?.pro?.priceDisplay?.[locale] || product.pricing?.pro?.priceDisplay?.en || '۰'
  const freePrice = product.pricing?.free?.priceDisplay?.[locale] || 'Free'

  return (
    <div
      className={`group relative rounded-3xl border bg-[var(--color-bg)] overflow-hidden transition-all duration-500 ${
        featured
          ? 'border-[var(--color-accent)]/30 shadow-xl shadow-[var(--color-accent)]/10'
          : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/20 hover:shadow-xl hover:shadow-[var(--color-accent)]/5 hover:-translate-y-2'
      } ${isRtl ? 'text-right' : 'text-left'}`}
    >
      <div className="relative h-52 bg-gradient-to-br from-[var(--color-accent)]/10 via-[var(--color-tech)]/5 to-transparent overflow-hidden">
        {product.screenshots?.[0] ? (
          <Image
            src={product.screenshots[0].src}
            alt={product.screenshots[0].alt[locale] || product.screenshots[0].alt.en}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl opacity-10 group-hover:scale-110 transition-transform duration-500">📦</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {featured && (
            <span className="px-3 py-1 text-[10px] font-bold text-white bg-yellow-500 rounded-full shadow-lg">
              {locale === 'fa' ? '⭐ ویژه' : '⭐ Featured'}
            </span>
          )}
          <span className="px-3 py-1 text-[10px] font-medium text-white/90 bg-[var(--color-accent)]/80 rounded-full backdrop-blur-sm">
            {product.tech.slice(0, 2).join(' · ')}
          </span>
        </div>

        <div className={`absolute bottom-3 ${isRtl ? 'right-3' : 'left-3'} opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0`}>
          <Link
            href={product.demoUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            {t('store.viewDemo')}
          </Link>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold text-[var(--color-primary)] leading-snug group-hover:text-[var(--color-accent)] transition-colors">
            {product.title[locale] || product.title.en}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-xs font-bold text-[var(--color-text)]/60">5.0</span>
          </div>
        </div>

        <p className="text-sm text-[var(--color-text)]/50 leading-relaxed mb-4 line-clamp-2">
          {product.shortDescription[locale] || product.shortDescription.en}
        </p>

        <div className="flex items-center gap-2 mb-5">
          {product.features?.[locale]?.slice(0, 2).map((feature, i) => (
            <span key={i} className="flex items-center gap-1 text-xs text-[var(--color-text)]/40">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[var(--color-accent)]">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {feature.length > 25 ? feature.slice(0, 25) + '...' : feature}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
          <div>
            <div className="text-xs text-[var(--color-text)]/40 mb-0.5">
              {locale === 'fa' ? 'شروع قیمت' : 'Starting at'}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[var(--color-accent)]">
                {priceDisplay}
              </span>
              {product.pricing?.pro?.period?.[locale] && (
                <span className="text-xs text-[var(--color-text)]/40">
                  {product.pricing.pro.period[locale]}
                </span>
              )}
            </div>
          </div>

          <Link
            href={`/store/${product.slug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 active:scale-95 transition-all shadow-md shadow-[var(--color-accent)]/20"
          >
            {t('store.buyNow')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isRtl ? 'rotate-180' : ''}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
