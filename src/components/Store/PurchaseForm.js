'use client'

import { useState, useEffect } from 'react'
import ReceiptUpload from './ReceiptUpload'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { planPriceLine } from '@/lib/number-fa'

export default function PurchaseForm({ product, selectedPlan }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState(null)
  const [paymentInfo, setPaymentInfo] = useState({ bankName: '', cardNumber: '', accountHolder: '' })
  const [uniqueAmount, setUniqueAmount] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    domain: '',
    hostingInfo: '',
  })
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    fetch('/api/payment-info')
      .then(res => res.json())
      .then(data => setPaymentInfo(data))
      .catch(() => {})
  }, [])

  const isProPlan = selectedPlan === 'pro'
  const isStarterPlan = selectedPlan === 'starter'

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\s/g, '')
    return /^09\d{9}$/.test(cleaned)
  }

  const planInfo = product.pricing[selectedPlan]
  const priceDisplay = planPriceLine(planInfo, locale)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setValidationError('')

    // Validate name
    if (!formData.name.trim()) {
      setValidationError(locale === 'fa' ? 'نام را وارد کنید' : 'Please enter your name')
      return
    }

    // Validate phone
    if (!validatePhone(formData.phone)) {
      setValidationError(locale === 'fa' ? 'شماره تلفن باید ۱۱ رقم و با ۰۹ شروع شود' : 'Phone number must be 11 digits starting with 09')
      return
    }

    // Validate domain for pro plan
    if (isProPlan && !formData.domain.trim()) {
      setValidationError(locale === 'fa' ? 'دامنه برای پلن حرفه‌ای ضروری است' : 'Domain is required for Pro plan')
      return
    }

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
      setUniqueAmount(data.uniqueAmount)
      setStatus('order_created')
    } catch (err) {
      let errorMessage = 'خطا در ثبت سفارش'
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        errorMessage = locale === 'fa' ? 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید' : 'Connection error. Please check your internet connection'
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
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
              <span className="font-medium text-[var(--color-text)]">{paymentInfo.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text)]/50">{isRtl ? 'شماره کارت' : 'Card Number'}</span>
              <span className="font-mono font-medium text-[var(--color-text)]" dir="ltr">{paymentInfo.cardNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text)]/50">{isRtl ? 'صاحب حساب' : 'Account Holder'}</span>
              <span className="font-medium text-[var(--color-text)]">{paymentInfo.accountHolder}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--color-border)]">
              <span className="text-[var(--color-text)]/50">{t('store.purchaseForm.amount')}</span>
              <span className="font-bold text-[var(--color-accent)]">
                {uniqueAmount ? uniqueAmount.toLocaleString('fa-IR') : priceDisplay}
              </span>
            </div>
            {uniqueAmount && (
              <p className="text-xs text-[var(--color-accent)] font-medium">
                {locale === 'fa' ? 'لطفاً دقیقاً همین مبلغ را واریز کنید' : 'Please pay this exact amount'}
              </p>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--color-text)]/50">{isRtl ? 'دوره پرداخت' : 'Payment Period'}</span>
              <span className="font-medium text-[var(--color-text)]">
                {isProPlan
                  ? (locale === 'fa' ? 'یکبار ( دائمی )' : 'One-time (permanent)')
                  : (locale === 'fa' ? 'ماهانه' : 'Monthly')
                }
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--color-text)]/40 leading-relaxed">
            {isProPlan
              ? (locale === 'fa' ? 'پس از پرداخت، کد منبع برای شما ارسال می‌شود.' : 'After payment, source code will be sent to you.')
              : (locale === 'fa' ? 'اشتراک شما پس از تایید پرداخت فعال می‌شود و هر ماه نیاز به تمدید دارد.' : 'Your subscription will be activated after payment confirmation and needs monthly renewal.')
            }
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <h4 className="text-sm font-bold text-[var(--color-primary)] mb-4">
            {t('store.purchaseForm.uploadReceipt')}
          </h4>
          <ReceiptUpload orderId={orderId} onSuccess={() => setStatus('idle')} expectedAmount={planInfo?.price || 0} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <h3 className="text-base font-bold text-[var(--color-primary)] mb-1">
        {t('store.purchaseForm.title')}
      </h3>
      <p className="text-xs text-[var(--color-text)]/50 mb-4">
        {locale === 'fa'
          ? 'همین الان سفارشت رو ثبت کن، ظرف چند ساعت باهات تماس می‌گیریم'
          : 'Place your order now — we\'ll contact you within a few hours'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="px-4 py-3 text-sm rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}
        {validationError && (
          <div className="px-4 py-3 text-sm rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
            {validationError}
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
            dir="ltr"
            pattern="09[0-9]{9}"
            title={locale === 'fa' ? 'شماره باید ۱۱ رقم و با ۰۹ شروع شود (مثال: ۰۹۱۲۳۴۵۶۷۸۹)' : 'Must be 11 digits starting with 09 (e.g. 09123456789)'}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            name="domain"
            required={isProPlan}
            value={formData.domain}
            onChange={handleChange}
            placeholder={isStarterPlan ? (locale === 'fa' ? 'دامنه اختصاصی (اختیاری)' : 'Custom domain (optional)') : `${t('store.purchaseForm.domain')} *`}
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

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--color-text)]/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          <span>{locale === 'fa' ? 'پرداخت کارت به کارت — تأیید طی چند ساعت' : 'Card-to-card payment — confirmed within hours'}</span>
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
