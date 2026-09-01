'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'
import ProductCard from './ProductCard'

export default function RelatedProducts({ currentProduct, allProducts }) {
  const { locale } = useI18n()

  if (!currentProduct || !allProducts || allProducts.length <= 1) return null

  const related = allProducts
    .filter(p => p.slug !== currentProduct.slug)
    .map(p => ({
      ...p,
      similarity: (p.tech || []).filter(t => currentProduct.tech?.includes(t)).length
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 2)

  if (related.length === 0) return null

  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-block px-4 py-1.5 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-accent-soft-10 rounded-full border border-accent-soft-20">
            {locale === 'fa' ? 'محصولات مشابه' : 'Related Products'}
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl font-black text-[var(--color-primary)]">
            {locale === 'fa' ? 'شاید اینا هم به کارت بیاد' : 'You Might Also Like'}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {related.map(product => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
