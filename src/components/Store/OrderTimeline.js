'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'

const STATUS_STEPS = [
  'awaiting_payment',
  'receipt_uploaded',
  'approved',
  'deploying',
  'completed',
]

const STATUS_ICONS = {
  awaiting_payment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  receipt_uploaded: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  approved: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  deploying: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  completed: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
}

export default function OrderTimeline({ status, statusHistory }) {
  const { locale } = useI18n()

  const currentIndex = STATUS_STEPS.indexOf(status)
  const isRejected = status === 'rejected'

  return (
    <div className="space-y-1">
      {STATUS_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex || (status === 'completed' && index === STATUS_STEPS.length - 1)
        const isCurrent = index === currentIndex
        const isFuture = index > currentIndex

        return (
          <div key={step} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                isCompleted
                  ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                  : isCurrent
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30'
                    : 'bg-[var(--color-surface)] text-[var(--color-text)]/30'
              }`}>
                {STATUS_ICONS[step]}
              </div>
              {index < STATUS_STEPS.length - 1 && (
                <div className={`w-0.5 h-8 ${
                  isCompleted ? 'bg-[var(--color-success)]/30' : 'bg-[var(--color-border)]'
                }`} />
              )}
            </div>
            <div className="pt-2">
              <p className={`text-sm font-medium ${
                isCurrent ? 'text-[var(--color-accent)]' : isCompleted ? 'text-[var(--color-success)]' : 'text-[var(--color-text)]/30'
              }`}>
                {locale === 'fa'
                  ? {
                      awaiting_payment: 'در انتظار پرداخت',
                      receipt_uploaded: 'رسید دریافت شد',
                      approved: 'پرداخت تایید شد',
                      deploying: 'در حال دیپلوی',
                      completed: 'دیپلوی کامل شد',
                    }[step]
                  : {
                      awaiting_payment: 'Awaiting Payment',
                      receipt_uploaded: 'Receipt Received',
                      approved: 'Payment Approved',
                      deploying: 'Deploying',
                      completed: 'Completed',
                    }[step]
                }
              </p>
              {isCurrent && (() => {
                const historyEntry = statusHistory?.findLast(h => h.status === step)
                return historyEntry && (
                  <p className="text-xs text-[var(--color-text)]/40 mt-0.5">
                    {new Date(historyEntry.at).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                  </p>
                )
              })()}
            </div>
          </div>
        )
      })}

      {isRejected && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600 font-medium">
            {locale === 'fa' ? 'پرداخت رد شد' : 'Payment Rejected'}
          </p>
          <p className="text-xs text-red-500 mt-1">
            {locale === 'fa' ? 'لطفاً با پشتیبانی تماس بگیرید' : 'Please contact support'}
          </p>
        </div>
      )}
    </div>
  )
}
