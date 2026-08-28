'use client'

import { useState } from 'react'
import { toman, faDateTime } from './shared'

const PLAN_LABELS = {
  free: 'رایگان',
  starter: 'استارتر',
  pro: 'حرفه‌ای',
}

export default function ReceiptViewer({ order, onClose }) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  if (!order?.receipt) return null

  const receiptAmount = order.receipt.amount || 0
  const expectedAmount = order.uniqueAmount || 0
  const hasMismatch = receiptAmount > 0 && expectedAmount > 0 && receiptAmount !== expectedAmount
  const diff = receiptAmount - expectedAmount

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-[var(--color-primary)]">مشاهده رسید پرداخت</h3>
          <button onClick={onClose} className="text-[var(--color-text)]/40 hover:text-[var(--color-text)] text-xl">
            ✕
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Receipt Image */}
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
            {order.receipt.filename && !imageError ? (
              <img
                src={`/api/admin/receipt/${order.receipt.filename}`}
                alt="رسید پرداخت"
                className="w-full h-auto object-contain max-h-[60vh]"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-2 p-4 text-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text)]/20">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <div className="space-y-1 text-sm">
                  <span className="text-[var(--color-text)]/50">
                    {imageLoading ? 'در حال بارگذاری...' : 'تصویر رسید موجود نیست'}
                  </span>
                  {!imageLoading && (
                    <button
                      onClick={() => setImageError(false)}
                      className="text-xs text-[var(--color-accent)] hover:underline"
                    >
                      تلاش مجدد
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Info */}
          <div className="space-y-4">
            {/* Amount Comparison */}
            <div className={`p-4 rounded-xl border ${hasMismatch ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
              <div className="text-xs font-medium text-[var(--color-text)]/50 mb-3">مقایسه مبلغ</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text)]/60">مبلغ انتظاری:</span>
                  <span className="font-bold text-[var(--color-primary)]">{toman(expectedAmount)} تومان</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text)]/60">مبلغ رسید:</span>
                  <span className={`font-bold ${hasMismatch ? 'text-red-600' : 'text-[var(--color-primary)]'}`}>
                    {receiptAmount > 0 ? `${toman(receiptAmount)} تومان` : '—'}
                  </span>
                </div>
                {hasMismatch && (
                  <div className="pt-2 border-t border-red-200">
                    <span className="text-xs font-medium text-red-600">
                      مغایرت: {toman(Math.abs(diff))} تومان {diff > 0 ? 'بیشتر' : 'کمتر'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Details */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
              <div className="text-xs font-medium text-[var(--color-text)]/50 mb-2">اطلاعات سفارش</div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text)]/60">کد سفارش:</span>
                <span className="font-mono text-xs text-[var(--color-text)]">{order.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text)]/60">مشتری:</span>
                <span className="text-[var(--color-text)]">{order.customer?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text)]/60">تلفن:</span>
                <span className="text-[var(--color-text)]" dir="ltr">{order.customer?.phone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text)]/60">پلن:</span>
                <span className="text-[var(--color-text)]">{PLAN_LABELS[order.plan] || order.plan || '—'}</span>
              </div>
              {order.receipt.trackingCode && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text)]/60">کد پیگیری بانکی:</span>
                  <span className="font-mono text-xs text-[var(--color-text)]">{order.receipt.trackingCode}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text)]/60">تاریخ آپلود:</span>
                <span className="text-xs text-[var(--color-text)]">{faDateTime(order.receipt.uploadedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
