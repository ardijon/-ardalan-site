'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function ProductCard({ product, featured = false }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  const isComingSoon = product.status === 'coming_soon'

  // Two pricing shapes coexist: `pricing.starter/pro` for anything that can go
  // through PurchaseForm, and a flat `priceSummary` for products that are only a
  // number on a page (a range, or "contact for pricing").
  const hasPlanPricing = Boolean(product.pricing?.pro || product.pricing?.starter)
  const priceDisplay = product.pricing?.starter?.priceDisplay?.[locale] || product.pricing?.starter?.priceDisplay?.en || product.pricing?.pro?.priceDisplay?.[locale] || ''
  const periodDisplay = product.pricing?.starter?.period?.[locale] || product.pricing?.pro?.period?.[locale] || ''
  const summaryLabel = product.priceSummary?.display?.[locale] || product.priceSummary?.display?.en || ''

  const audience = product.audience?.[locale] || product.audience?.en || ''
  const techBadge = (product.tech || []).slice(0, 2).join(' · ')

  return (
    <div
      className={`group relative flex h-full flex-col rounded-3xl border bg-[var(--color-bg)] overflow-hidden transition-all duration-500 ${
        featured
          ? 'border-[var(--color-accent)]/30 shadow-xl shadow-[var(--color-accent)]/10'
          : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/20 hover:shadow-xl hover:shadow-[var(--color-accent)]/5 hover:-translate-y-2'
      } ${isRtl ? 'text-right' : 'text-left'}`}
    >
      <div className="relative h-52 shrink-0 bg-gradient-to-br from-[var(--color-accent)]/10 via-[var(--color-tech)]/5 to-transparent overflow-hidden">
        {product.screenshots?.[0] ? (
          <Image
            src={product.screenshots[0].src}
            alt={product.screenshots[0].alt[locale] || product.screenshots[0].alt.en}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl opacity-10 group-hover:scale-110 transition-transform duration-500" aria-hidden="true">📦</span>
            <span className="sr-only">{locale === 'fa' ? 'پیش‌نمایش موجود نیست' : 'No preview available'}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {featured && (
            <span className="px-3 py-1 text-[10px] font-bold text-white bg-[var(--color-accent)] rounded-full shadow-lg">
              {locale === 'fa' ? '⭐ ویژه' : '⭐ Featured'}
            </span>
          )}
          {isComingSoon && (
            <span className="px-3 py-1 text-[10px] font-bold text-white bg-[var(--color-tech)] rounded-full shadow-lg">
              {t('store.comingSoon')}
            </span>
          )}
          {techBadge && (
            // Dark scrim, not accent: over an empty gradient (a product with no
            // screenshot yet) white-on-light was unreadable.
            <span className="px-3 py-1 text-[10px] font-medium text-white whitespace-nowrap bg-black/45 rounded-full backdrop-blur-sm">
              {techBadge}
            </span>
          )}
        </div>

        {/* Only Tavana has a demo today; without this guard the anchor rendered
            with href={undefined} on the two upcoming products. */}
        {product.demoUrl && (
          <div className={`absolute bottom-3 ${isRtl ? 'right-3' : 'left-3'}`}>
            <a
              href={product.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              {t('store.viewDemo')}
            </a>
          </div>
        )}
      </div>

      {/* flex-1 here plus mt-auto on the footer is what keeps every card in a row
          the same height with every CTA on the same line, whatever the copy
          length. The reserved min-heights stop a one-line title from pulling the
          rest of the card up out of alignment with its neighbours. */}
      <div className="p-6 flex flex-1 flex-col">
        <div className="mb-2 min-h-[1.125rem] text-[11px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
          {audience}
        </div>

        <h3 className="mb-3 min-h-[3.25rem] text-lg font-bold leading-snug text-[var(--color-primary)] line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
          {product.title[locale] || product.title.en}
        </h3>

        <p className="mb-4 min-h-[2.5rem] text-sm leading-relaxed text-[var(--color-text)]/50 line-clamp-2">
          {product.shortDescription[locale] || product.shortDescription.en}
        </p>

        <div className="mb-5 flex min-h-[1rem] items-center gap-3 overflow-hidden">
          {(product.features?.[locale] || product.features?.en || []).slice(0, 2).map((feature, i) => (
            <span key={i} className="flex min-w-0 items-center gap-1 text-xs text-[var(--color-text)]/40">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0 text-[var(--color-accent)]">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="line-clamp-1">{feature}</span>
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4 border-t border-[var(--color-border)]">
          {/* Fixed height so a price that wraps to two lines cannot shove this
              card's button out of line with the others. */}
          <div className="flex min-h-[3rem] min-w-0 flex-1 flex-col justify-end">
            {hasPlanPricing ? (
              <>
                <div className="text-xs text-[var(--color-text)]/40 mb-0.5">
                  {locale === 'fa' ? 'شروع از' : 'Starting from'}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[var(--color-accent)]">
                    {priceDisplay}
                  </span>
                  {periodDisplay && (
                    <span className="text-xs text-[var(--color-text)]/40">
                      {periodDisplay}
                    </span>
                  )}
                </div>
              </>
            ) : summaryLabel ? (
              // A range or "contact for pricing" is the whole statement, so it gets
              // no "starting from" prefix to argue with.
              <div className="text-base font-black leading-snug text-[var(--color-accent)]">
                {summaryLabel}
              </div>
            ) : null}
          </div>

          <Link
            href={`/store/${product.slug}`}
            className={`inline-flex shrink-0 items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl active:scale-95 transition-all ${
              isComingSoon
                ? 'text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/10'
                : 'text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 shadow-md shadow-[var(--color-accent)]/20'
            }`}
          >
            {isComingSoon ? t('store.moreInfo') : t('store.buyNow')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isRtl ? 'rotate-180' : ''}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
