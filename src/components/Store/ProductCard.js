'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function ProductCard({ product }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  return (
    <div
      className={`group relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${isRtl ? 'text-right' : 'text-left'}`}
    >
      <div className="relative h-48 bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-tech)]/20 overflow-hidden">
        {product.screenshots?.[0] ? (
          <Image
            src={product.screenshots[0].src}
            alt={product.screenshots[0].alt[locale] || product.screenshots[0].alt.en}
            fill
            className="object-cover group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl opacity-20">📦</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 text-xs font-medium text-white/90 bg-[var(--color-accent)]/80 rounded-full backdrop-blur-sm">
            {product.tech.slice(0, 3).join(' · ')}
          </span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-[var(--color-primary)] mb-2">
          {product.title[locale] || product.title.en}
        </h3>
        <p className="text-sm text-[var(--color-text)]/60 leading-relaxed mb-4 line-clamp-2">
          {product.shortDescription[locale] || product.shortDescription.en}
        </p>

        <div className="flex items-center gap-3">
          <Link
            href={`/store/${product.slug}`}
            className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 transition-colors"
          >
            {t('store.buyNow')}
          </Link>
          <Link
            href={product.demoUrl}
            className="px-4 py-2.5 text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-xl hover:bg-[var(--color-accent)]/10 transition-colors"
          >
            {t('store.viewDemo')}
          </Link>
        </div>
      </div>
    </div>
  )
}
