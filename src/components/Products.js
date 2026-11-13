'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { planPriceLine, summaryPriceLine } from '@/lib/number-fa'
import { toPersianDigits } from '@/lib/jalali'

/**
 * The landing page's bridge into the store.
 *
 * A visitor arriving at "اردلان پیری، توسعه‌دهنده" has no reason to click a
 * "Store" item tucked into the nav bar. This section is what makes the store a
 * destination: it states the ladder (one agent → a team → an organisation) as
 * three commerce cards and hands every level a link.
 *
 * Deliberately a summary, not a second copy of `/store`: no plan comparison, no
 * feature lists. Each card carries a cover, who it is for, one sentence, two
 * value chips, an honest "starting from" price and a single CTA — enough to pick
 * a level and click through, because the product page is where the selling
 * actually happens.
 *
 * The covers are generated brand art (gradient + glyph), not screenshots, so no
 * image asset rides into the landing bundle. The catalogue arrives as a prop,
 * trimmed — `page.js` reads it on the server and only the summary crosses to the
 * client (see `src/lib/product-summary.js`). The refresh effect stays because the
 * homepage prerenders: a product added from the admin panel is in KV but not in
 * the prerendered HTML, and the fetch is what puts it on screen.
 */

// A product with no tier sorts last so anything added from the admin panel still
// shows up instead of silently vanishing.
function byTier(a, b) {
  return (a.tier ?? 99) - (b.tier ?? 99)
}

// Decorative cover art per product. Fixed brand hues — like app icons, a cover
// reads the same in light and dark — with a white glyph on top. Teal for the
// individual agent, amber for the team tool, indigo for the organisation system.
const COVER_ART = {
  'agent-site': {
    gradient: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="11" r="2" />
        <path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 9.5h4M14 12.5h4M14 15.5h2.5" />
      </svg>
    ),
  },
  tavana: {
    gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.7-3 2.9-4.5 5.5-4.5s4.8 1.5 5.5 4.5" />
        <circle cx="17" cy="9" r="2.3" />
        <path d="M16 14.6c2.3.2 3.9 1.6 4.5 4" />
      </svg>
    ),
  },
  rahyar: {
    gradient: 'linear-gradient(135deg, #4338CA 0%, #6366F1 100%)',
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
        <path d="M9 10h.01M12 10h.01M15 10h.01M9 13.5h.01M12 13.5h.01M15 13.5h.01" />
      </svg>
    ),
  },
}

const FALLBACK_ART = {
  gradient: 'linear-gradient(135deg, #0D9488 0%, #0EA5E9 100%)',
  icon: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  ),
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
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-accent-soft-10 rounded-full">
              {t('products.badge')}
            </span>
            <h2 className="mt-6 text-[clamp(1.75rem,4vw,2.75rem)] font-black text-[var(--color-primary)] text-balance">
              {t('products.title')}
            </h2>
            <p className="mt-4 text-base sm:text-lg text-text-soft-50 leading-relaxed">
              {t('products.subtitle')}
            </p>
            {t('products.highlights')?.map((line, i) => (
              <p key={i} className="mt-2 text-sm text-[var(--color-accent)] font-medium">
                {line}
              </p>
            ))}
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
              <div className="h-80 skeleton rounded-3xl" />
              <div className="h-80 skeleton rounded-3xl" />
              <div className="h-80 skeleton rounded-3xl" />
            </div>
          ) : (
            <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ordered.map((product) => (
                <ProductCard
                  key={product.slug}
                  product={product}
                  isRtl={isRtl}
                  locale={locale}
                  t={t}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * One rung of the ladder, as a commerce card. Kept at module scope so React
 * reconciles it by position instead of remounting the list when the fetch
 * resolves. `h-full` + `flex-1` body + `mt-auto` footer keep every CTA on one
 * line whatever the copy length.
 */
function ProductCard({ product, isRtl, locale, t }) {
  const isComingSoon = product.status === 'coming_soon'

  const audience = product.audience?.[locale] || product.audience?.en || ''
  const title = product.shortTitle?.[locale] || product.shortTitle?.en || ''
  const summary = product.shortDescription?.[locale] || product.shortDescription?.en || ''

  // Two pricing shapes: `pricing.starter/pro` for anything purchasable, a flat
  // `priceSummary` for a range or "contact for pricing".
  const hasPlanPricing = Boolean(product.pricing?.starter || product.pricing?.pro)
  const planPrice = planPriceLine(product.pricing?.starter || product.pricing?.pro, locale)
  const planPeriod = product.pricing?.starter?.period?.[locale] || product.pricing?.pro?.period?.[locale] || ''
  const summaryPrice = summaryPriceLine(product.priceSummary, locale)

  return (
    <li
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-[var(--color-card)] transition-all duration-500 ${
        product.featured
          ? 'border-accent-soft-40 shadow-xl shadow-accent-soft-10 ring-1 ring-accent-soft-20'
          : 'border-[var(--color-border)] hover:-translate-y-2 hover:border-accent-soft-20 hover:shadow-xl hover:shadow-accent-soft-5'
      } ${isRtl ? 'text-right' : 'text-left'}`}
    >
      <ProductCover
        slug={product.slug}
        tier={product.tier}
        featured={product.featured}
        isComingSoon={isComingSoon}
        locale={locale}
        t={t}
      />

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-2 min-h-[1.125rem] text-[11px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
          {audience}
        </div>
        <h3 className="mb-2 min-h-[2.75rem] text-lg font-bold leading-snug text-[var(--color-primary)] transition-colors group-hover:text-[var(--color-accent)]">
          {title}
        </h3>
        <p className="mb-4 min-h-[2.5rem] text-sm leading-relaxed text-text-soft-50 line-clamp-2">
          {summary}
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-text-soft-5 px-2.5 py-1 text-[11px] text-text-soft-60">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {t('products.metaSupport')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-text-soft-5 px-2.5 py-1 text-[11px] text-text-soft-60">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-tech)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
              <path d="M6 6h.01M6 18h.01" />
            </svg>
            {t('products.metaHosting')}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--color-border)] pt-4">
          {/* Fixed height so a price that wraps to two lines cannot shove this
              card's button out of line with the others. */}
          <div className="flex min-h-[3rem] min-w-0 flex-1 flex-col justify-end">
            {hasPlanPricing ? (
              <>
                <div className="mb-0.5 text-xs text-text-soft-40">{t('store.startingFrom')}</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[var(--color-accent)]">{planPrice}</span>
                  {planPeriod && <span className="text-xs text-text-soft-40">{planPeriod}</span>}
                </div>
              </>
            ) : summaryPrice ? (
              // A range or "contact for pricing" is the whole statement, so it
              // gets no "starting from" prefix to argue with.
              <div className="text-base font-black leading-snug text-[var(--color-accent)]">{summaryPrice}</div>
            ) : null}
          </div>

          <Link
            href={`/store/${product.slug}`}
            prefetch={false}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 ${
              isComingSoon
                ? 'border border-accent-soft-30 text-[var(--color-accent)] hover:bg-accent-soft-10'
                : 'bg-[var(--color-accent)] text-white shadow-md shadow-accent-soft-20 hover:opacity-90'
            }`}
          >
            {isComingSoon ? t('store.moreInfo') : t('store.buyNow')}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={isRtl ? 'rotate-180' : ''}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </li>
  )
}

/**
 * Generated cover art: a bold brand gradient, a faint girih-like lattice, a soft
 * glow and a frosted glyph. The tier chip keeps the "sizes of the same thing"
 * ladder legible; featured / coming-soon badges sit at the inline-start corner so
 * they land correctly in both RTL and LTR.
 */
function ProductCover({ slug, tier, featured, isComingSoon, locale, t }) {
  const patternId = useId()
  const art = COVER_ART[slug] || FALLBACK_ART
  const level = tier ? (locale === 'fa' ? toPersianDigits(tier) : String(tier)) : null

  return (
    <div className="relative h-44 shrink-0 overflow-hidden sm:h-48" style={{ background: art.gradient }}>
      <svg className="absolute inset-0 h-full w-full opacity-[0.16]" aria-hidden="true">
        <defs>
          <pattern id={patternId} width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M13 0L26 13L13 26L0 13Z" fill="none" stroke="#fff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/25 blur-2xl" aria-hidden="true" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-sm transition-transform duration-500 group-hover:scale-110">
          {art.icon}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" aria-hidden="true" />

      <div className="absolute top-3 start-3 flex items-center gap-2">
        {featured && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-bold text-amber-700 shadow-sm backdrop-blur">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
            </svg>
            {t('products.featured')}
          </span>
        )}
        {isComingSoon && (
          <span className="rounded-lg border border-white/25 bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
            {t('store.comingSoon')}
          </span>
        )}
      </div>

      {level && (
        <span className="absolute bottom-3 start-3 rounded-lg border border-white/20 bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {t('products.level')} {level}
        </span>
      )}
    </div>
  )
}
