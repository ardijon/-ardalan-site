'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'

export default function PricingTable({ pricing, selectedPlan, onSelectPlan }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  const plans = [
    { key: 'free', ...pricing.free, highlighted: false },
    { key: 'starter', ...pricing.starter, highlighted: false },
    { key: 'pro', ...pricing.pro, highlighted: true },
  ]

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {plans.map((plan) => {
        const isSelected = selectedPlan === plan.key
        return (
          <div
            key={plan.key}
            onClick={() => onSelectPlan(plan.key)}
            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
              isSelected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 shadow-lg shadow-[var(--color-accent)]/10 scale-[1.02]'
                : plan.highlighted
                  ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]/20'
            }`}
          >
            {plan.highlighted && (
              <span className={`absolute -top-3 ${isRtl ? 'right-4' : 'left-4'} px-3 py-1 text-xs font-bold text-white bg-[var(--color-accent)] rounded-full`}>
                {isRtl ? 'محبوب‌ترین' : 'Popular'}
              </span>
            )}

            {isSelected && (
              <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'}`}>
                <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              </div>
            )}

            <h3 className="text-lg font-bold text-[var(--color-primary)] mb-2">
              {t(`store.${plan.key === 'pro' ? 'professional' : plan.key}`)}
            </h3>

            <div className="mb-4">
              <span className="text-3xl font-black text-[var(--color-primary)]">
                {plan.priceDisplay[locale] || plan.priceDisplay.en}
              </span>
              {plan.period[locale] && (
                <span className="text-sm text-[var(--color-text)]/50 mr-1">
                  {plan.period[locale]}
                </span>
              )}
            </div>

            <ul className="space-y-2 mb-6">
              {(plan.features[locale] || plan.features.en || []).map((feature, i) => (
                <li key={i} className={`flex items-start gap-2 text-sm text-[var(--color-text)]/70 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelectPlan(plan.key)
              }}
              className={`w-full py-2.5 px-4 text-sm font-bold rounded-xl transition-all ${
                isSelected
                  ? 'text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'
                  : plan.highlighted
                    ? 'text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90'
                    : 'text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/10'
              }`}
            >
              {plan.cta[locale] || plan.cta.en}
            </button>
          </div>
        )
      })}
    </div>
  )
}
