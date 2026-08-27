'use client'

import { useState } from 'react'
import OrderTimeline from './OrderTimeline'
import { useI18n } from '@/lib/i18n/I18nProvider'
import products from '@/lib/products'
import { formatJalali } from '@/lib/jalali'

export default function OrderTracker() {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  const getProductName = (productId) => {
    const product = products.find(p => p.slug === productId)
    return product?.title?.[locale] || product?.title?.en || productId
  }
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)
  const [formData, setFormData] = useState({
    phone: '',
    orderId: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('searching')
    setError('')
    setOrder(null)

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Not found')
      }

      setOrder(data.order)
      setStatus('found')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder={t('store.order.phone')}
            required
            className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
            dir="ltr"
          />
        </div>
        <div>
          <input
            type="text"
            value={formData.orderId}
            onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
            placeholder={t('store.order.orderId')}
            required
            className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all font-mono"
            dir="ltr"
          />
        </div>

        {error && (
          <div className="px-4 py-3 text-sm rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'searching'}
          className="w-full py-3 px-6 text-sm font-bold text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 disabled:opacity-50 transition-all"
        >
          {status === 'searching' ? t('store.order.tracking') : t('store.order.track')}
        </button>
      </form>

      {order && (
        <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--color-text)]/50">{t('store.order.status')}</span>
              <span className="text-xs font-mono text-[var(--color-text)]/40">{order.id}</span>
            </div>
          </div>

          <OrderTimeline
            status={order.status}
            statusHistory={order.statusHistory}
          />

          <div className="mt-6 pt-4 border-t border-[var(--color-border)] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text)]/50">{t('store.order.product')}</span>
              <span className="font-medium text-[var(--color-text)]">{getProductName(order.product)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text)]/50">{t('store.order.plan')}</span>
              <span className="font-medium text-[var(--color-text)]">
                {locale === 'fa'
                  ? (order.plan === 'pro' ? 'حرفه‌ای (یکبار)' : 'ماهانه')
                  : (order.plan === 'pro' ? 'Pro (one-time)' : 'Monthly')
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text)]/50">{t('store.order.createdAt')}</span>
              <span className="font-medium text-[var(--color-text)]">
                {locale === 'fa'
                  ? formatJalali(order.createdAt)
                  : new Date(order.createdAt).toLocaleDateString('en-US')}
              </span>
            </div>
            {order.plan === 'pro' && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text)]/50">{locale === 'fa' ? 'مبلغ' : 'Amount'}</span>
                <span className="font-bold text-[var(--color-accent)]">
                  {locale === 'fa' ? '۱۴,۹۰۰,۰۰۰ تومان' : '$149'}
                </span>
              </div>
            )}
            {order.plan === 'starter' && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text)]/50">{locale === 'fa' ? 'مبلغ ماهانه' : 'Monthly Amount'}</span>
                <span className="font-bold text-[var(--color-accent)]">
                  {locale === 'fa' ? '۴۹۰,۰۰۰ تومان/ماه' : '$5/month'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
