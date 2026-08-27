'use client'

import ProductCard from './ProductCard'
import { useI18n } from '@/lib/i18n/I18nProvider'

/**
 * The catalogue as a ladder rather than a flat grid.
 *
 * The three products are not a random set — they solve the same industry's
 * problem at three sizes: one agent, a manager with a team, a whole company.
 * Ordering by `tier` is what makes that legible, and it answers the question a
 * visitor actually arrives with ("which of these is for me?") instead of making
 * them compare feature lists.
 *
 * A product with no `tier` sorts last so anything added from the admin panel
 * still shows up instead of silently vanishing.
 */
function byTier(a, b) {
  return (a.tier ?? 99) - (b.tier ?? 99)
}

export default function ProductLadder({ products }) {
  const { t } = useI18n()

  const ordered = [...(products || [])].sort(byTier)

  if (ordered.length === 0) return null

  return (
    <section id="products" className="py-8 sm:py-12 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-primary)]">
            {t('store.ladderTitle')}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[var(--color-text)]/50 max-w-xl mx-auto">
            {t('store.ladderSubtitle')}
          </p>
        </div>

        {/* No items-start: the cards must stretch to the tallest in the row so
            their buttons land on one line. */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ordered.map((product) => (
            <ProductCard key={product.slug} product={product} featured={product.featured} />
          ))}
        </div>
      </div>
    </section>
  )
}
