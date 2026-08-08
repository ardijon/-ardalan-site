'use client'

import { useState, useCallback, useRef } from 'react'
import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'
import TrustSeal from './TrustSeal'

const contactIcons = [
  <svg key="phone" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
  </svg>,
  <svg key="telegram" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.013-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>,
  <svg key="location" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>,
  <svg key="whatsapp" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>,
]

export default function Contact() {
  const { t, dir } = useI18n()
  const isRtl = dir === 'rtl'
  const [ref, visible] = useInView({ threshold: 0.08 })
  const [ripples, setRipples] = useState([])
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)
  const [validationError, setValidationError] = useState('')
  const buttonRef = useRef(null)

  const contactLinks = t('contact.links')

  const addRipple = useCallback((e) => {
    const target = e.currentTarget || e
    const rect = target.getBoundingClientRect()
    const x = (e.clientX || rect.width / 2) - rect.left
    const y = (e.clientY || rect.height / 2) - rect.top
    const size = Math.max(rect.width, rect.height)
    const id = Date.now() + Math.random()
    setRipples(prev => [...prev, { id, x, y, size }])
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 600)
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const name = (data.get('name') || '').toString().trim()
    const phone = (data.get('phone') || '').toString().trim()
    const message = (data.get('message') || '').toString().trim()

    if (!name || !phone || !message) {
      setValidationError(t('contact.form.validationError'))
      setTimeout(() => setValidationError(''), 3000)
      return
    }

    setValidationError('')
    setSending(true)
    setError(false)

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, message }),
      })
      if (!res.ok) throw new Error()
      setSent(true)
      const btn = buttonRef.current
      if (btn) addRipple(btn)
      form.reset()
      setTimeout(() => setSent(false), 5000)
    } catch {
      setError(true)
      setTimeout(() => setError(false), 5000)
    } finally {
      setSending(false)
    }
  }, [addRipple, t])

  return (
    <section id="contact" className="py-16 sm:py-20 lg:py-28 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
              {t('contact.badge')}
            </span>
            <div className="flex items-center justify-center gap-3 mt-6">
              <TrustSeal size={32} />
              <h2 className="text-[clamp(1.5rem,5vw,3.75rem)] font-black text-[var(--color-primary)]">
                {t('contact.title')}
              </h2>
            </div>
            <p className="mt-4 text-[var(--color-text)]/50">
              {t('contact.subtitle')}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-5">
              {contactLinks.map((link, i) => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(16px)',
                    transition: `opacity 0.5s ease ${200 + i * 100}ms, transform 0.5s ease ${200 + i * 100}ms`,
                  }}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
                    {contactIcons[i]}
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text)]/40 font-medium">
                      {link.label}
                    </p>
                    <p className="text-sm font-medium text-[var(--color-text)] mt-0.5">
                      {link.value}
                    </p>
                  </div>
                </a>
              ))}
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-10 grid sm:grid-cols-2 gap-4"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 0.5s ease 650ms, transform 0.5s ease 650ms`,
              }}
            >
              <div className="col-span-full sm:col-span-1">
                <label htmlFor="contact-name" className="sr-only">{t('contact.form.name')}</label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder={t('contact.form.name')}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text)]/30 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all"
                />
              </div>
              <div className="col-span-full sm:col-span-1">
                <label htmlFor="contact-phone" className="sr-only">{t('contact.form.phone')}</label>
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder={t('contact.form.phone')}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text)]/30 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all"
                />
              </div>
              <div className="col-span-full">
                <label htmlFor="contact-message" className="sr-only">{t('contact.form.message')}</label>
                <textarea
                  id="contact-message"
                  name="message"
                  placeholder={t('contact.form.message')}
                  rows="4"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text)]/30 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all resize-none"
                />
              </div>
              <button
                ref={buttonRef}
                type="submit"
                disabled={sending}
                className="col-span-full relative overflow-hidden px-6 py-3 bg-[var(--color-accent)] text-white font-medium rounded-xl hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-lg shadow-[var(--color-accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ripples.map((r) => (
                  <span
                    key={r.id}
                    className="absolute rounded-full bg-white/30 pointer-events-none"
                    style={{
                      left: r.x - r.size / 2,
                      top: r.y - r.size / 2,
                      width: r.size,
                      height: r.size,
                      animation: 'ripple 600ms ease-out forwards',
                    }}
                  />
                ))}
                <span className="relative z-10">{sending ? t('contact.form.sending') : t('contact.form.send')}</span>
              </button>

              {sent && (
                <p
                  role="status"
                  className="col-span-full mt-2 text-sm font-medium text-[var(--color-tech)] text-center"
                >
                  {t('contact.form.success')}
                </p>
              )}

              {error && (
                <p
                  role="status"
                  className="col-span-full mt-2 text-sm font-medium text-red-500 text-center"
                >
                  {t('contact.form.error')}
                </p>
              )}

              {validationError && (
                <p
                  role="status"
                  className="col-span-full mt-2 text-sm font-medium text-amber-500 text-center"
                >
                  {validationError}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
