'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'

/**
 * Customer quotes on a product page.
 *
 * Renders nothing at all when there is nothing real to show. That is the whole
 * design constraint: the alternative — a "what customers say" heading over an
 * empty box, or worse a placeholder quote — is a claim the site cannot back, and
 * a ۱۴.۹ million toman product survives exactly one of those before the visitor
 * stops believing anything else on the page.
 *
 * `quote` falls back to Persian when the English text is missing rather than
 * hiding the entry: a real Persian quote on the English page is more useful than
 * no proof, and forcing a translation before a testimonial can go up would mean
 * it never goes up.
 */
export default function Testimonials({ testimonials }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  const items = (testimonials || [])
    .map(item => ({
      name: item?.name || '',
      role: item?.role?.[locale] || item?.role?.fa || item?.role?.en || '',
      quote: item?.quote?.[locale] || item?.quote?.fa || item?.quote?.en || '',
      rating: Number(item?.rating) || 0,
    }))
    .filter(item => item.quote && item.name)

  if (items.length === 0) return null

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">
        {t('store.testimonialsTitle')}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item, i) => (
          <figure
            key={i}
            className={`flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 ${isRtl ? 'text-right' : 'text-left'}`}
            style={{ direction: isRtl ? 'rtl' : 'ltr' }}
          >
            {item.rating > 0 && (
              <div className="mb-3 flex items-center gap-0.5" aria-label={`${item.rating} / 5`}>
                {Array.from({ length: 5 }, (_, star) => (
                  <span
                    key={star}
                    aria-hidden="true"
                    className={star < item.rating ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]/15'}
                  >
                    ★
                  </span>
                ))}
              </div>
            )}

            <blockquote className="flex-1 text-sm leading-relaxed text-[var(--color-text)]/75">
              {item.quote}
            </blockquote>

            <figcaption className="mt-4 flex items-center gap-3 border-t border-[var(--color-border)] pt-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-sm font-black text-[var(--color-accent)]">
                {item.name.trim().charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[var(--color-primary)]">
                  {item.name}
                </span>
                {item.role && (
                  <span className="block truncate text-xs text-[var(--color-text)]/40">
                    {item.role}
                  </span>
                )}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
