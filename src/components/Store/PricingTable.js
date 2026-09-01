'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'
import { priceText } from '@/lib/number-fa'

const comparisonFeatures = [
  {
    key: 'ownership',
    fa: 'مالکیت کد منبع',
    en: 'Source code ownership',
    starter: false,
    pro: true,
  },
  {
    key: 'hosting',
    fa: 'هاست اختصاصی',
    en: 'Custom hosting',
    starter: true,
    pro: true,
  },
  {
    key: 'domain',
    fa: 'دامنه اختصاصی',
    en: 'Custom domain',
    starter: true,
    pro: true,
  },
  {
    key: 'deploy',
    fa: 'دیپلوی روی هاست شخصی',
    en: 'Deploy on personal hosting',
    starter: false,
    pro: true,
  },
  {
    key: 'support',
    fa: 'پشتیبانی فنی',
    en: 'Technical support',
    starter: true,
    pro: true,
  },
  {
    key: 'updates',
    fa: 'آپدیت‌های دوره‌ای',
    en: 'Periodic updates',
    starter: true,
    pro: true,
  },
  {
    key: 'training',
    fa: 'آموزش راه‌اندازی',
    en: 'Setup tutorial',
    starter: false,
    pro: true,
  },
  {
    key: 'recurring',
    fa: 'پرداخت ماهانه',
    en: 'Monthly payment',
    starter: true,
    pro: false,
  },
]

export default function PricingTable({ pricing, selectedPlan, onSelectPlan }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  // Only the plans that actually exist. Spreading an absent one produced
  // `{ key: 'starter' }` with no priceDisplay, and reading .priceDisplay[locale]
  // threw — which is exactly what happened once the catalogue gained products
  // that carry `pricing: {}` because they cannot be bought yet.
  const plans = [
    pricing?.starter && { key: 'starter', ...pricing.starter, highlighted: false },
    pricing?.pro && { key: 'pro', ...pricing.pro, highlighted: true },
  ].filter(Boolean)

  if (plans.length === 0) return null

  return (
    <div className="space-y-6">
      {/* Plan cards — a radiogroup: selection is a single choice, and AT must
          announce which plan is checked before the buyer submits. The card
          itself is no longer role="button": a button inside a button is invalid
          ARIA and double-fired on keyboard Enter (the CTA's click bubbled into
          the card's onKeyDown). The whole card is clickable via the CTA and
          onClick, but only the radiogroup semantics are exposed. */}
      <div className="grid sm:grid-cols-2 gap-4 items-stretch" role="radiogroup" aria-label={locale === 'fa' ? 'انتخاب پلن' : 'Plan selection'}>
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.key
          return (
            <div
              key={plan.key}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelectPlan(plan.key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectPlan(plan.key) } }}
              className={`relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col ${
                isSelected
                  ? 'border-[var(--color-accent)] bg-accent-soft-5 shadow-lg shadow-accent-soft-10 scale-[1.02]'
                  : plan.highlighted
                    ? 'border-accent-soft-30 bg-accent-soft-5'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-accent-soft-20'
              }`}
            >
              {plan.highlighted && (
                <span className={`absolute -top-3 ${isRtl ? 'right-4' : 'left-4'} px-3 py-1 text-xs font-bold text-white bg-[var(--color-accent)] rounded-full`}>
                  {isRtl ? 'محبوب‌ترین' : 'Popular'}
                </span>
              )}

              {isSelected && (
                <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'}`}>
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                </div>
              )}

              <h3 className="text-lg font-bold text-[var(--color-primary)] mb-2">
                {t(`store.${plan.key === 'pro' ? 'professional' : plan.key}`)}
              </h3>

              <div className="mb-4 whitespace-nowrap">
                <span className="text-3xl font-black text-[var(--color-primary)]">
                  {priceText(plan.priceDisplay?.[locale] || plan.priceDisplay?.en, plan.price, locale)}
                </span>
                {plan.period?.[locale] && (
                  <span className={`text-sm text-text-soft-50 ${isRtl ? 'ml-1' : 'mr-1'}`}>
                    {plan.period[locale]}
                  </span>
                )}
              </div>

              <ul className="space-y-2 mb-6" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
                {(plan.features?.[locale] || plan.features?.en || []).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-soft-70">
                    <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-accent-soft-10 text-[var(--color-accent)] flex items-center justify-center text-[10px]" aria-hidden="true">
                      ✓
                    </span>
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectPlan(plan.key)
                  }}
                  className={`w-full py-2.5 px-4 text-sm font-bold rounded-xl transition-all ${
                    isSelected
                      ? 'text-white bg-[var(--color-accent)] hover:bg-accent-soft-90'
                      : plan.highlighted
                        ? 'text-white bg-[var(--color-accent)] hover:bg-accent-soft-90'
                        : 'text-[var(--color-accent)] border border-accent-soft-30 hover:bg-accent-soft-10'
                  }`}
                >
                  {plan.cta?.[locale] || plan.cta?.en || t('store.buyNow')}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* A starter-vs-pro comparison says nothing when only one of them exists. */}
      {plans.length === 2 && (
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <h4 className="text-sm font-bold text-[var(--color-primary)] mb-3 text-center">
          {locale === 'fa' ? 'مقایسه دو پلن' : 'Compare Plans'}
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className={`py-2 ${isRtl ? 'text-right' : 'text-left'} text-text-soft-60 font-medium`}>
                  {locale === 'fa' ? 'ویژگی' : 'Feature'}
                </th>
                <th className="py-2 text-center text-text-soft-60 font-medium w-20">
                  {locale === 'fa' ? 'استارتر' : 'Starter'}
                </th>
                <th className="py-2 text-center text-[var(--color-accent)] font-bold w-20">
                  {locale === 'fa' ? 'حرفه‌ای' : 'Pro'}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((feature) => (
                <tr key={feature.key} className="border-b border-text-soft-20 last:border-0">
                  <td className={`py-2.5 ${isRtl ? 'text-right' : 'text-left'} text-text-soft-80`}>
                    {feature[locale]}
                  </td>
                  <td className="py-2.5 text-center">
                    {feature.starter ? (
                      <span className="inline-flex w-5 h-5 rounded-full bg-success-soft-10 text-[var(--color-success)] items-center justify-center text-xs">✓</span>
                    ) : (
                      <span className="inline-flex w-5 h-5 rounded-full bg-text-soft-5 text-text-soft-20 items-center justify-center text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-center">
                    {feature.pro ? (
                      <span className="inline-flex w-5 h-5 rounded-full bg-success-soft-10 text-[var(--color-success)] items-center justify-center text-xs">✓</span>
                    ) : (
                      <span className="inline-flex w-5 h-5 rounded-full bg-text-soft-5 text-text-soft-20 items-center justify-center text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  )
}
