'use client'

import { useI18n } from '@/lib/i18n/I18nProvider'
import Countdown from './Countdown'

const LAUNCH_DATE = '2026-08-05T00:00:00+03:30'

export default function StoreCountdown() {
  const { t, locale } = useI18n()

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="relative p-8 sm:p-10 rounded-3xl border border-[var(--color-accent)]/20 bg-gradient-to-br from-[var(--color-accent)]/5 to-transparent text-center overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[var(--color-accent)] rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <span className="inline-block px-4 py-1.5 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full mb-6">
              {locale === 'fa' ? 'به‌زودی' : 'COMING SOON'}
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-primary)] mb-3">
              {locale === 'fa'
                ? 'فروشگاه در حال راه‌اندازی است'
                : 'Store is Launching Soon'}
            </h2>

            <p className="text-[var(--color-text)]/60 mb-8 max-w-md mx-auto">
              {locale === 'fa'
                ? 'محصولات حرفه‌ای به‌زودی در دسترس قرار می‌گیرند'
                : 'Professional products will be available soon'}
            </p>

            <Countdown targetDate={LAUNCH_DATE} />

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-[var(--color-text)]/50">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{locale === 'fa' ? 'اطلاع‌رسانی با ایمیل' : 'Email notification'}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{locale === 'fa' ? 'تضمین کیفیت' : 'Quality guaranteed'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
