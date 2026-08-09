'use client'

import { useState } from 'react'
import ReceiptUpload from './ReceiptUpload'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function PurchaseForm({ product, selectedPlan }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    domain: '',
    hostingInfo: '',
    message: '',
  })

  const planInfo = product.pricing[selectedPlan]
  const priceDisplay = planInfo?.priceDisplay?.[locale] || planInfo?.priceDisplay?.en || ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setError('')

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.slug,
          plan: selectedPlan,
          customer: formData,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create order')
      }

      setOrderId(data.orderId)
      setStatus('order_created')
    } catch (err) {
      setError(err.message || 'خطا در ثبت سفارش')
      setStatus('idle')
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (status === 'order_created' && orderId) {
    return (
      <div className="space-y-6">
        <div className="text-center py-6 px-6 rounded-2xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-[var(--color-primary)] mb-2">
            {locale === 'fa' ? 'سفارش ثبت شد!' : 'Order Placed!'}
          </h3>
          <p className="text-sm text-[var(--color-text)]/60 mb-3">
            {locale === 'fa' ? 'کد پیگیری شما:' : 'Your tracking code:'}
          </p>
          <div className="inline-block px-4 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
            <span className="font-mono text-lg font-bold text-[var(--color-accent)]">{orderId}</span>
          </div>
          <div className="mt-4">
            <a
              href="/store/track"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-lg hover:bg-[var(--color-accent)]/20 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {locale === 'fa' ? 'پیگیری سفارش' : 'Track Order'}
            </a>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <h4 className="text-sm font-bold text-[var(--color-primary)] mb-3">
            {t('store.purchaseForm.bankInfo')}
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text)]/50">{isRtl ? 'نام بانک' : 'Bank'}</span>
              <span className="font-medium text-[var(--color-text)]">{t('store.purchaseForm.bankName')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text)]/50">{isRtl ? 'شماره کارت' : 'Card Number'}</span>
              <span className="font-mono font-medium text-[var(--color-text)]" dir="ltr">{t('store.purchaseForm.cardNumber')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text)]/50">{isRtl ? 'صاحب حساب' : 'Account Holder'}</span>
              <span className="font-medium text-[var(--color-text)]">{t('store.purchaseForm.holderName')}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--color-border)]">
              <span className="text-[var(--color-text)]/50">{t('store.purchaseForm.amount')}</span>
              <span className="font-bold text-[var(--color-accent)]">{priceDisplay}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--color-text)]/40 leading-relaxed">
            {t('store.purchaseForm.instructions')}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <h4 className="text-sm font-bold text-[var(--color-primary)] mb-4">
            {t('store.purchaseForm.uploadReceipt')}
          </h4>
          <ReceiptUpload orderId={orderId} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <h3 className="text-base font-bold text-[var(--color-primary)] mb-4">
        {t('store.purchaseForm.title')}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="px-4 py-3 text-sm rounded-xl bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder={`${t('store.purchaseForm.name')} *`}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
            dir={isRtl ? 'rtl' : 'ltr'}
          />
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            placeholder={`${t('store.purchaseForm.phone')} *`}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
            dir={isRtl ? 'rtl' : 'ltr'}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            name="domain"
            required
            value={formData.domain}
            onChange={handleChange}
            placeholder={`${t('store.purchaseForm.domain')} *`}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
            dir={isRtl ? 'rtl' : 'ltr'}
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t('store.purchaseForm.email')}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
            dir={isRtl ? 'rtl' : 'ltr'}
          />
        </div>

        <div>
          <textarea
            name="hostingInfo"
            rows={2}
            value={formData.hostingInfo}
            onChange={handleChange}
            placeholder={t('store.purchaseForm.hostingInfo')}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all resize-none"
            dir={isRtl ? 'rtl' : 'ltr'}
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full py-3 px-6 text-sm font-bold text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {status === 'submitting' ? t('store.purchaseForm.submitting') : t('store.purchaseForm.submit')}
        </button>
      </form>
    </div>
  )
}
