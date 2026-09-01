'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

/**
 * Waitlist signup for a product that has not shipped.
 *
 * A countdown on its own produces nothing. A countdown plus a list means there
 * is an audience to tell on release day, which is the only reason to advertise
 * an unfinished product at all.
 */
export default function NotifyForm({ productSlug }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ phone: '', email: '' })

  // Same rule as PurchaseForm: an Iranian mobile number, 11 digits from 09.
  const isValidPhone = (phone) => /^09\d{9}$/.test(phone.replace(/\s/g, ''))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!isValidPhone(form.phone)) {
      setError(locale === 'fa' ? 'شماره تلفن باید ۱۱ رقم و با ۰۹ شروع شود' : 'Phone number must be 11 digits starting with 09')
      return
    }

    setStatus('submitting')

    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productSlug, phone: form.phone.trim(), email: form.email.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'failed')

      setStatus('done')
    } catch (err) {
      setError(
        err.message === 'Failed to fetch' || err.name === 'TypeError'
          ? (locale === 'fa' ? 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید' : 'Connection error. Please check your internet connection')
          : t('store.notify.error')
      )
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <div className="p-5 rounded-2xl bg-accent-soft-5 border border-accent-soft-20 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent-soft-10 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <p className="text-sm font-bold text-[var(--color-primary)]">{t('store.notify.success')}</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3"
      style={{ direction: isRtl ? 'rtl' : 'ltr' }}
    >
      <div>
        <h3 className="text-base font-bold text-[var(--color-primary)]">{t('store.notify.title')}</h3>
        <p className="mt-1 text-xs text-text-soft-50">{t('store.notify.subtitle')}</p>
      </div>

      <input
        type="tel"
        name="phone"
        inputMode="numeric"
        autoComplete="tel"
        required
        placeholder={t('store.notify.phone')}
        value={form.phone}
        onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
        className="w-full px-4 py-2.5 text-sm rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-text-soft-40 focus:outline-none focus:border-accent-soft-50 transition-colors"
      />

      <input
        type="email"
        name="email"
        autoComplete="email"
        placeholder={t('store.notify.email')}
        value={form.email}
        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
        className="w-full px-4 py-2.5 text-sm rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-text-soft-40 focus:outline-none focus:border-accent-soft-50 transition-colors"
      />

      {error && (
        <p className="px-3 py-2 text-xs rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full py-2.5 px-4 text-sm font-bold text-white bg-[var(--color-accent)] rounded-xl hover:bg-accent-soft-90 active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-all"
      >
        {status === 'submitting' ? t('store.notify.submitting') : t('store.notify.submit')}
      </button>
    </form>
  )
}
