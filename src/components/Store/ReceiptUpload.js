'use client'

import { useState, useRef, useId } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function ReceiptUpload({ orderId, onSuccess, expectedAmount, customerPhone }) {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [formData, setFormData] = useState({
    amount: '',
    trackingCode: '',
  })
  const fileInputRef = useRef(null)
  const amountId = useId()
  const trackingId = useId()

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError(locale === 'fa' ? 'حجم فایل حداکثر 5MB باشد' : 'Max file size is 5MB')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError(locale === 'fa' ? 'فرمت فایل معتبر نیست (فقط JPG, PNG, WebP)' : 'Invalid file type (JPG, PNG, WebP only)')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const file = fileInputRef.current?.files[0]
    if (!file) {
      setError(locale === 'fa' ? 'لطفاً تصویر رسید را انتخاب کنید' : 'Please select a receipt image')
      return
    }

    // Client-side sanity check against the ORDER'S exact amount. The server
    // enforces a tight ±5,000 window; this only catches obvious typos before a
    // 5 MB upload is spent. The old check compared against 0.9×/2× the base
    // plan price, which rejected the real payable amount (base + random
    // suffix) for about half of all starter orders — after the money had
    // already been transferred.
    if (expectedAmount && formData.amount) {
      const paid = Number(formData.amount.replace(/\D/g, ''))
      if (paid < expectedAmount - 5000) {
        setError(locale === 'fa'
          ? `مبلغ پرداختی (${paid.toLocaleString('fa-IR')} تومان) با مبلغ سفارش (${expectedAmount.toLocaleString('fa-IR')} تومان) مطابقت ندارد`
          : `Paid amount (${paid.toLocaleString('en-US')} Tomans) does not match the order amount (${expectedAmount.toLocaleString('en-US')} Tomans)`
        )
        return
      }
      if (paid > expectedAmount + 5000) {
        setError(locale === 'fa'
          ? `مبلغ پرداختی (${paid.toLocaleString('fa-IR')} تومان) با مبلغ سفارش (${expectedAmount.toLocaleString('fa-IR')} تومان) مطابقت ندارد`
          : `Paid amount (${paid.toLocaleString('en-US')} Tomans) does not match the order amount (${expectedAmount.toLocaleString('en-US')} Tomans)`
        )
        return
      }
    }

    setStatus('uploading')
    setError('')

    const submitData = new FormData()
    submitData.append('receipt', file)
    submitData.append('amount', formData.amount)
    submitData.append('trackingCode', formData.trackingCode)
    // Second factor: the server rejects an upload whose phone does not match
    // the order's buyer, so a bare (enumerable) order ID is not enough.
    submitData.append('phone', customerPhone || '')

    try {
      const res = await fetch(`/api/orders/${orderId}/receipt`, {
        method: 'POST',
        body: submitData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setStatus('success')
      onSuccess?.()
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8 px-6 rounded-2xl bg-success-soft-5 border border-success-soft-20">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-success-soft-10 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-success)]">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h4 className="text-lg font-bold text-[var(--color-primary)] mb-1">
          {locale === 'fa' ? 'رسید با موفقیت آپلود شد' : 'Receipt uploaded successfully'}
        </h4>
        <p className="text-sm text-text-soft-50">
          {locale === 'fa' ? 'پس از بررسی، نتیجه به شما اطلاع داده می‌شود' : 'You will be notified after review'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <h4 className="text-sm font-bold text-[var(--color-primary)] mb-3">
          {t('store.purchaseForm.uploadReceipt')}
        </h4>

        {/* A real button, not a click-only div: the file picker must be reachable
            by keyboard, and the hidden input is display:none — unfocusable. */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            preview
              ? 'border-success-soft-30 bg-success-soft-5'
              : 'border-[var(--color-border)] hover:border-accent-soft-30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />

          {preview ? (
            <div className="space-y-3">
              <img
                src={preview}
                alt={locale === 'fa' ? 'پیش‌نمایش رسید' : 'Receipt preview'}
                className="max-h-40 mx-auto rounded-lg object-contain"
              />
              <p className="text-xs text-[var(--color-success)]">
                {locale === 'fa' ? 'فایل انتخاب شد' : 'File selected'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-text-soft-30" aria-hidden="true">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm text-text-soft-50">
                {t('store.purchaseForm.selectFile')}
              </p>
              <p className="text-xs text-text-soft-30">
                {t('store.purchaseForm.receiptHint')}
              </p>
            </div>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={amountId} className="block text-xs text-text-soft-50 mb-1">
            {locale === 'fa' ? 'مبلغ پرداختی (تومان)' : 'Amount Paid (Toman)'}
          </label>
          <div className="relative">
            <input
              id={amountId}
              type="text"
              inputMode="numeric"
              value={formData.amount ? Number(formData.amount).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US') : ''}
              onChange={(e) => {
                let raw = e.target.value
                raw = raw.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                raw = raw.replace(/[^\d]/g, '')
                setFormData(prev => ({ ...prev, amount: raw }))
              }}
              placeholder={locale === 'fa' ? 'مثلاً ۴٬۹۰۰٬۰۰۰' : 'e.g. 4,900,000'}
              className="w-full pl-14 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-accent-soft-50"
              dir="ltr"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-soft-50 pointer-events-none bg-[var(--color-bg)] px-1">
              {locale === 'fa' ? 'تومان' : 'Toman'}
            </span>
          </div>
        </div>
        <div>
          <label htmlFor={trackingId} className="block text-xs text-text-soft-50 mb-1">
            {locale === 'fa' ? 'کد پیگیری' : 'Tracking Code'}
          </label>
          <input
            id={trackingId}
            type="text"
            value={formData.trackingCode}
            onChange={(e) => setFormData(prev => ({ ...prev, trackingCode: e.target.value }))}
            placeholder={locale === 'fa' ? 'کد پیگیری تراکنش' : 'Transaction code'}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-accent-soft-50"
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="px-4 py-2 text-sm rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'uploading' || !preview}
        className="w-full py-2.5 px-4 text-sm font-bold text-white bg-[var(--color-accent)] rounded-xl hover:bg-accent-soft-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {status === 'uploading'
          ? (locale === 'fa' ? 'در حال آپلود...' : 'Uploading...')
          : (locale === 'fa' ? 'ارسال رسید' : 'Submit Receipt')}
      </button>
    </form>
  )
}
