'use client'

import Link from 'next/link'
import Countdown from '@/components/Countdown'
import NotifyForm from './NotifyForm'
import { useI18n } from '@/lib/i18n/I18nProvider'

/**
 * Replaces the pricing table and purchase form on a product that is not out yet.
 *
 * `PricingTable` needs a starter/pro pair and `PurchaseForm` branches on those
 * same two keys, so an unreleased product cannot go through them — and should
 * not: taking money for something undeliverable is the one thing this store must
 * never do. What it can do is state the price honestly and collect an audience.
 */
export default function ComingSoonPanel({ product }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  const summary = product.priceSummary
  const priceLabel = summary?.display?.[locale] || summary?.display?.en || ''
  const priceNote = summary?.note?.[locale] || summary?.note?.en || ''

  // Rahyar sells in a conversation, not from a page: the ask is a direct call,
  // with the waitlist as the low-commitment fallback.
  const isContactOnly = product.pricingMode === 'contact'

  return (
    <div className="space-y-5" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="p-6 rounded-2xl border-2 border-[var(--color-tech)]/30 bg-[var(--color-tech)]/5">
        <span className="inline-block px-3 py-1 mb-3 text-[11px] font-bold text-white bg-[var(--color-tech)] rounded-full">
          {t('store.comingSoon')}
        </span>

        {priceLabel && (
          <div className="text-2xl font-black text-[var(--color-primary)]">{priceLabel}</div>
        )}

        {priceNote && (
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-text)]/50">{priceNote}</p>
        )}
      </div>

      {/* Renders nothing until a release date exists, which is the point: the
          timer is wired up but stays dark while the dates are still estimates. */}
      <Countdown releaseAt={product.releaseAt} />

      {isContactOnly && (
        <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <h3 className="text-base font-bold text-[var(--color-primary)] mb-3">
            {t('store.notify.contactTitle')}
          </h3>
          <Link
            href="/#contact"
            className="inline-flex w-full items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 active:scale-95 transition-all"
          >
            {t('store.notify.contactCta')}
          </Link>
        </div>
      )}

      <NotifyForm productSlug={product.slug} />
    </div>
  )
}
