'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import ProductDetail from './ProductDetail'
import PricingTable from './PricingTable'
import PurchaseForm from './PurchaseForm'
import ComingSoonPanel from './ComingSoonPanel'
import RelatedProducts from './RelatedProducts'
import VisitTracker from './VisitTracker'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function ProductClient({ product, allProducts = [] }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const pricingRef = useRef(null)

  const isComingSoon = product.status === 'coming_soon'
  const audience = product.audience?.[locale] || product.audience?.en || ''

  return (
    <main className="pb-20">
      <VisitTracker slug={product.slug} />

      <section className="pt-28 sm:pt-32 pb-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <Link
            href="/store"
            className={`inline-flex items-center gap-2 text-sm text-[var(--color-text)]/50 hover:text-[var(--color-accent)] transition-colors mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isRtl ? 'rotate-180' : ''}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t('store.backToStore')}
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            {audience && (
              <span className="px-3 py-1 text-[11px] font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
                {audience}
              </span>
            )}
            {isComingSoon && (
              <span className="px-3 py-1 text-[11px] font-bold text-white bg-[var(--color-tech)] rounded-full">
                {t('store.comingSoon')}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-primary)]">
            {product.title[locale] || product.title.en}
          </h1>
          <p className="mt-2 text-base text-[var(--color-text)]/60 max-w-2xl">
            {product.shortDescription[locale] || product.shortDescription.en}
          </p>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          {/*
            min-w-0 on both columns is load-bearing, not tidying. A grid item's
            `min-width` defaults to `auto`, which resolves to its min-content size —
            and the gallery inside column one contains a nowrap row of 23 thumbnails,
            so that min-content is 2464px. The strip's own `overflow-x: auto` makes it
            scrollable but not shrinkable: a scroll container's overflow does not
            shorten its *ancestors'* min-content, so the track base size became 2464
            and the page overflowed the viewport by 1694px on a landscape phone.
            min-w-0 lets the track shrink to the space available, and the strip then
            scrolls the way it was always meant to.
          */}
          <div className="grid lg:grid-cols-5 gap-10">
            <div className="lg:col-span-3 min-w-0">
              <ProductDetail product={product} />
            </div>

            <div className="lg:col-span-2 min-w-0" ref={pricingRef}>
              <div className="lg:sticky lg:top-28 space-y-6">
                {isComingSoon ? (
                  <ComingSoonPanel product={product} />
                ) : (
                  <>
                    <PricingTable
                      pricing={product.pricing}
                      selectedPlan={selectedPlan}
                      onSelectPlan={setSelectedPlan}
                    />

                    {selectedPlan && (
                      <PurchaseForm product={product} selectedPlan={selectedPlan} />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <RelatedProducts currentProduct={product} allProducts={allProducts} />
    </main>
  )
}
