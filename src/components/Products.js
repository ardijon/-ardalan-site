'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { planPriceLine, summaryPriceLine } from '@/lib/number-fa'

/**
 * The landing page's bridge into the store.
 *
 * A visitor arriving at "اردلان پیری، توسعه‌دهنده" has no reason to click a
 * "Store" item tucked into the nav bar. This section is what makes the store a
 * destination: it states the ladder (one agent → a team → an organisation) in
 * three lines and hands every level a link.
 *
 * Deliberately a summary, not a second copy of `/store`: no screenshots, no
 * feature lists, no plan comparison. Its only job is to make the visitor pick a
 * level and click through, because the product page is where the selling actually
 * happens.
 *
 * The catalogue arrives as a prop, trimmed. `page.js` is a server component and
 * reads it there, so the 37 KB of screenshots and copy in `@/lib/products` never
 * enters the landing bundle — see `src/lib/product-summary.js` for what is kept.
 * The refresh effect below stays anyway: the homepage prerenders, so a product
 * added from the admin panel is in KV but not in the prerendered HTML, and the
 * fetch is what puts it on screen.
 *
 * This used to be the other way round — no prop, `useState(null)`, and the fetch
 * as the only source — on the reasoning that the section rendered behind
 * `ssr: false` so nothing was lost by waiting a round trip. That stopped being
 * true when `ssr: false` came off: for a while the server HTML carried three empty
 * skeletons where the product names should be.
 */

// A product with no tier sorts last so anything added from the admin panel still
// shows up instead of silently vanishing.
function byTier(a, b) {
  return (a.tier ?? 99) - (b.tier ?? 99)
}

export default function Products({ initialProducts }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [ref, visible] = useInView({ threshold: 0.08 })

  const [products, setProducts] = useState(initialProducts ?? null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/products')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled) return
        // `prev ?? []` and not `[]`: the rows are server-rendered now, so a
        // refresh that comes back empty must not be able to erase cards that are
        // already on screen. It can only fill a list that was never populated.
        if (Array.isArray(data?.products)) setProducts(data.products)
        else setProducts(prev => prev ?? [])
      })
      .catch(() => {
        // Falls through to the store link below rather than an error state: the
        // point of this section is the click, and that still works.
        if (!cancelled) setProducts(prev => prev ?? [])
      })
    return () => { cancelled = true }
  }, [])

  const loading = products === null
  const ordered = loading ? [] : [...products].sort(byTier)

  return (
    <section id="products" className="py-16 sm:py-20 lg:py-28 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
              {t('products.badge')}
            </span>
            <h2 className="mt-6 text-[clamp(1.5rem,5vw,3.75rem)] font-black text-[var(--color-primary)] whitespace-nowrap">
              {t('products.title')}
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[var(--color-text)]/50 leading-relaxed">
              {t('products.subtitle')}
            </p>
            {t('products.highlights')?.map((line, i) => (
              <p key={i} className="mt-2 text-sm text-[var(--color-accent)] font-medium">
                {line}
              </p>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4" aria-hidden="true">
              <div className="h-28 skeleton rounded-2xl" />
              <div className="h-28 skeleton rounded-2xl" />
              <div className="h-28 skeleton rounded-2xl" />
            </div>
          ) : (
            <ol className="space-y-4">
              {ordered.map((product, i) => (
                <ProductRow
                  key={product.slug}
                  product={product}
                  step={i + 1}
                  isRtl={isRtl}
                  locale={locale}
                  t={t}
                />
              ))}
            </ol>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/store"
              className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-[var(--color-accent)] border-2 border-[var(--color-accent)]/30 rounded-xl hover:bg-[var(--color-accent)] hover:text-white transition-all duration-300"
            >
              {t('products.viewAll')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={isRtl ? 'rotate-180' : ''}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * One rung of the ladder. Kept at module scope rather than inlined so React
 * reconciles it by position instead of remounting the whole list when the fetch
 * resolves.
 */
function ProductRow({ product, step, isRtl, locale, t }) {
  const isComingSoon = product.status === 'coming_soon'

  const audience = product.audience?.[locale] || product.audience?.en || ''
  const title = product.shortTitle?.[locale] || product.shortTitle?.en || ''
  const summary = product.shortDescription?.[locale] || product.shortDescription?.en || ''

  // Two pricing shapes: `pricing.starter/pro` for anything purchasable, a flat
  // `priceSummary` for a range or "contact for pricing".
  const planPrice = planPriceLine(product.pricing?.starter || product.pricing?.pro, locale)
  const planPeriod = product.pricing?.starter?.period?.[locale] || product.pricing?.pro?.period?.[locale] || ''
  const summaryPrice = summaryPriceLine(product.priceSummary, locale)

  return (
    <li
      className={`group relative flex flex-col gap-4 p-5 sm:p-6 rounded-2xl border bg-[var(--color-bg)] transition-all duration-300 sm:flex-row sm:items-center ${
        product.featured
          ? 'border-[var(--color-accent)]/30 shadow-lg shadow-[var(--color-accent)]/5'
          : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/20'
      } ${isRtl ? 'text-right' : 'text-left'}`}
    >
      {/* The step number is the whole point of the ladder metaphor — it says
          "these are sizes of the same thing", not three unrelated products. */}
      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:gap-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-base font-black text-[var(--color-accent)]">
          {step.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text)]/30">
          {t('products.levelLabel')}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {audience && (
            <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
              {audience}
            </span>
          )}
          {isComingSoon && (
            <span className="rounded-full bg-[var(--color-tech)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-tech)]">
              {t('store.comingSoon')}
            </span>
          )}
        </div>
        <h3 className="mt-1 text-base font-bold leading-snug text-[var(--color-primary)] group-hover:text-[var(--color-accent)] transition-colors sm:text-lg">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text)]/50">
          {summary}
        </p>
      </div>

      <div className={`flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center ${isRtl ? 'sm:text-right' : 'sm:text-left'}`}>
        <div className="min-w-0">
          {planPrice ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-[var(--color-accent)] whitespace-nowrap">{planPrice}</span>
              {planPeriod && <span className="text-xs text-[var(--color-text)]/40">{planPeriod}</span>}
            </div>
          ) : summaryPrice ? (
            <span className="text-sm font-black leading-snug text-[var(--color-accent)]">{summaryPrice}</span>
          ) : null}
        </div>

        <Link
          href={`/store/${product.slug}`}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
            isComingSoon
              ? 'text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/10'
              : 'text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 shadow-md shadow-[var(--color-accent)]/20'
          }`}
        >
          {isComingSoon ? t('store.moreInfo') : t('store.buyNow')}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={isRtl ? 'rotate-180' : ''}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </li>
  )
}
