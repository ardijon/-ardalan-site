'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import ProductDetail from './ProductDetail'
import PricingTable from './PricingTable'
import PurchaseForm from './PurchaseForm'
import RelatedProducts from './RelatedProducts'
import { useI18n } from '@/lib/i18n/I18nProvider'
import products from '@/lib/products'

export default function ProductClient({ product }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const pricingRef = useRef(null)

  function handleBuyClick() {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="pb-20">
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
          <div className="grid lg:grid-cols-5 gap-10">
            <div className="lg:col-span-3">
              <ProductDetail product={product} />
            </div>

            <div className="lg:col-span-2" ref={pricingRef}>
              <div className="sticky top-28 space-y-6">
                <PricingTable
                  pricing={product.pricing}
                  selectedPlan={selectedPlan}
                  onSelectPlan={setSelectedPlan}
                />

                {selectedPlan && (
                  <PurchaseForm product={product} selectedPlan={selectedPlan} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <RelatedProducts currentProduct={product} allProducts={products} />
    </main>
  )
}
