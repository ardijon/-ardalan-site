'use client'

import { useState } from 'react'
import Link from 'next/link'
import ProductDetail from './ProductDetail'
import PricingTable from './PricingTable'
import PurchaseForm from './PurchaseForm'
import GirihDivider from '@/components/GirihDivider'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function ProductClient({ product }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [selectedPlan, setSelectedPlan] = useState(null)

  return (
    <main>
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

          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--color-primary)]">
              {product.title[locale] || product.title.en}
            </h1>
            <p className="mt-3 text-lg text-[var(--color-text)]/60 max-w-2xl">
              {product.description[locale] || product.description.en}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mb-10">
            <a
              href={product.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              {t('store.viewLiveDemo')}
            </a>
            {product.github && (
              <a
                href={product.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--color-text)]/70 border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-text)]/5 transition-colors"
              >
                GitHub
              </a>
            )}
          </div>
        </div>
      </section>

      <GirihDivider />

      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <ProductDetail product={product} />

            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-6">
                  {t('store.pricing')}
                </h2>
                <PricingTable
                  pricing={product.pricing}
                  onSelectPlan={setSelectedPlan}
                />
              </div>

              {selectedPlan && selectedPlan !== 'free' && (
                <div>
                  <GirihDivider />
                  <div className="mt-8">
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
    </main>
  )
}
