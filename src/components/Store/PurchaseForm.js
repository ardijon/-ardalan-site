'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function PurchaseForm({ product, selectedPlan }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    domain: '',
    message: '',
  })

  const planNames = { free: 'رایگان', starter: 'استارتر', pro: 'حرفه‌ای' }
  const planNamesEn = { free: 'Free', starter: 'Starter', pro: 'Professional' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    setError('')

    const planInfo = product.pricing[selectedPlan]
    const planName = locale === 'fa' ? planNames[selectedPlan] : planNamesEn[selectedPlan]
    const priceDisplay = planInfo?.priceDisplay?.[locale] || planInfo?.priceDisplay?.en || ''

    const text = `🛒 سفارش جدید از فروشگاه\n\n📦 محصول: ${product.title.fa}\n💳 پلن: ${planName} (${priceDisplay})\n\n👤 نام: ${formData.name}\n📞 تلفن: ${formData.phone}\n🌐 دامنه: ${formData.domain}\n💬 توضیحات: ${formData.message || 'ندارد'}\n\n⏰ ${new Date().toLocaleDateString('fa-IR')} ${new Date().toLocaleTimeString('fa-IR')}`

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          message: text,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send')
      }

      setStatus('success')
    } catch (err) {
      setError(err.message || 'خطا در ارسال')
      setStatus('idle')
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (status === 'success') {
    return (
      <div className="text-center py-12 px-6 rounded-2xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-success)]">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[var(--color-primary)] mb-2">
          {t('store.purchaseForm.success')}
        </h3>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="px-4 py-3 text-sm rounded-xl bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]/70 mb-1.5">
            {t('store.purchaseForm.name')} *
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
            dir={isRtl ? 'rtl' : 'ltr'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]/70 mb-1.5">
            {t('store.purchaseForm.phone')} *
          </label>
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            placeholder="09xxxxxxxxx"
            className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]/70 mb-1.5">
            {t('store.purchaseForm.domain')} *
          </label>
          <input
            type="text"
            name="domain"
            required
            value={formData.domain}
            onChange={handleChange}
            placeholder="example.com"
            className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)]/70 mb-1.5">
            {t('store.purchaseForm.message')}
          </label>
          <textarea
            name="message"
            rows={3}
            value={formData.message}
            onChange={handleChange}
            className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all resize-none"
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

      <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <h4 className="text-sm font-bold text-[var(--color-primary)] mb-3">
          {t('store.purchaseForm.bankInfo')}
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-text)]/50">{t('store.purchaseForm.bankName')}</span>
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
        </div>
        <p className="mt-3 text-xs text-[var(--color-text)]/40 leading-relaxed">
          {t('store.purchaseForm.instructions')}
        </p>
      </div>
    </div>
  )
}
