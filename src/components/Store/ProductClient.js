'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import ProductDetail from './ProductDetail'
import PricingTable from './PricingTable'
import PurchaseForm from './PurchaseForm'
import TrustBadges from './TrustBadges'
import SocialProof from './SocialProof'
import FaqSection from './FaqSection'
import StickyCTA from './StickyCTA'
import { useI18n } from '@/lib/i18n/I18nProvider'

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
      <section className="pt-28 sm:pt-32 pb-16 sm:pb-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <Link
            href="/store"
            className={`inline-flex items-center gap-2 text-sm text-[var(--color-text)]/50 hover:text-[var(--color-accent)] transition-colors mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isRtl ? 'rotate-180' : ''}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t('store.backToStore')}
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--color-primary)]">
              {product.title[locale] || product.title.en}
            </h1>
            <p className="mt-3 text-lg text-[var(--color-text)]/60 max-w-2xl">
              {product.description[locale] || product.description.en}
            </p>
          </div>

          <SocialProof />


        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <ProductDetail product={product} />

            <div className="space-y-8" ref={pricingRef}>
              <div>
                <PricingTable
                  pricing={product.pricing}
                  selectedPlan={selectedPlan}
                  onSelectPlan={setSelectedPlan}
                />
              </div>

              {selectedPlan && selectedPlan !== 'free' && (
                <div>
                  <div className="mt-4">
                    <h3 className="text-xl font-bold text-[var(--color-primary)] mb-4">
                      {t('store.purchaseForm.title')}
                    </h3>
                    <PurchaseForm product={product} selectedPlan={selectedPlan} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <TrustBadges />
        </div>
      </section>

      <FaqSection />

      <StickyCTA
        product={product}
        selectedPlan={selectedPlan}
        onBuy={handleBuyClick}
      />
    </main>
  )
}
