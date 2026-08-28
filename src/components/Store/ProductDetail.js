'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'
import ScreenshotGallery from './ScreenshotGallery'
import Testimonials from './Testimonials'

export default function ProductDetail({ product }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  if (!product) return null

  // Was a single shared dictionary key, so Tavana's pitch would have rendered on
  // every product page once the store held more than one product.
  const valueProposition = product.valueProposition?.[locale] || product.valueProposition?.en || ''
  const legalNote = product.legalNote?.[locale] || product.legalNote?.en || ''
  const tech = product.tech || []

  return (
    <div className="space-y-12">
      {valueProposition && (
        <div style={{ direction: isRtl ? 'rtl' : 'ltr', textAlign: 'justify' }}>
          {valueProposition.split('\n\n').map((paragraph, i) => (
            <p
              key={i}
              className={
                // The opening line is the strongest sentence on the page, so it
                // reads as a lead rather than as body copy.
                i === 0
                  ? 'text-lg sm:text-xl font-bold leading-relaxed text-[var(--color-primary)]'
                  : 'mt-3 text-sm leading-relaxed text-[var(--color-text)]/70'
              }
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {product.screenshots?.length > 0 && <ScreenshotGallery screenshots={product.screenshots} />}

      {/* After the pitch and the screenshots: the visitor has seen what it is,
          now someone other than the seller vouches for it. Renders nothing while
          the array is empty. */}
      <Testimonials testimonials={product.testimonials} />

      <div>
        <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">
          {t('store.features')}
        </h2>
        {product.featureGroups?.[locale] || product.featureGroups?.en ? (
          <div className="grid sm:grid-cols-3 gap-6" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
            {(product.featureGroups[locale] || product.featureGroups.en).map((group, gi) => (
              <div key={gi} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{group.icon}</span>
                  <h3 className="text-sm font-bold text-[var(--color-primary)]">{group.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {group.items.map((item, ii) => (
                    <li key={ii} className="flex items-start gap-2 text-[var(--color-text)]/80">
                      <span className="mt-1 w-4 h-4 shrink-0 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                      <span className="text-xs leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </div>

      {legalNote && (
        <div
          className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]"
          style={{ direction: isRtl ? 'rtl' : 'ltr' }}
        >
          <h3 className="text-sm font-bold text-[var(--color-primary)] mb-1.5">
            {t('store.legalNote')}
          </h3>
          <p className="text-sm leading-relaxed text-[var(--color-text)]/60">{legalNote}</p>
        </div>
      )}

      {tech.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">
            {t('store.techStack')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {tech.map((item) => (
              <span
                key={item}
                className="px-3 py-1.5 text-xs font-medium text-[var(--color-tech)] bg-[var(--color-tech)]/10 rounded-full border border-[var(--color-tech)]/20"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
