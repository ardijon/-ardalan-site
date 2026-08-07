'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'
import ScreenshotGallery from './ScreenshotGallery'

export default function ProductDetail({ product }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  return (
    <div className="space-y-12">
      <ScreenshotGallery screenshots={product.screenshots} />

      <div>
        <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">
          {t('store.features')}
        </h2>
        <ul className="grid sm:grid-cols-2 gap-3" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
          {(product.features[locale] || product.features.en || []).map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-[var(--color-text)]/80">
              <span className="mt-1 w-5 h-5 shrink-0 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center text-xs">
                ✓
              </span>
              <span className="text-sm leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">
          {t('store.techStack')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {product.tech.map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 text-xs font-medium text-[var(--color-tech)] bg-[var(--color-tech)]/10 rounded-full border border-[var(--color-tech)]/20"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
