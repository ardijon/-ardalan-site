'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function StickyCTA({ product, selectedPlan, onBuy }) {
  const { t, locale } = useI18n()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleScroll() {
      const scrollY = window.scrollY
      setVisible(scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!visible) return null

  const plan = product.pricing[selectedPlan] || product.pricing.pro
  const priceDisplay = plan.priceDisplay[locale] || plan.priceDisplay.en

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[var(--color-bg)]/80 backdrop-blur-xl border-t border-[var(--color-border)]">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="hidden sm:block">
          <p className="text-xs text-[var(--color-text)]/50">
            {product.title[locale] || product.title.en}
          </p>
          <p className="text-lg font-black text-[var(--color-accent)]">
            {priceDisplay}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-1 sm:flex-none">
          <button
            onClick={onBuy}
            className="flex-1 sm:flex-none px-6 py-3 text-sm font-bold text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 active:scale-95 transition-all"
          >
            {t('store.buyNow')}
          </button>
        </div>
      </div>
    </div>
  )
}
