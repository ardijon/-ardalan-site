'use client'

import { useI18n } from './I18nProvider'

export default function LanguageSwitcher() {
  const { locale, toggleLocale } = useI18n()

  return (
    <button
      onClick={toggleLocale}
      className="min-w-11 h-11 px-2 flex items-center justify-center rounded-xl text-text-soft-60 hover:text-[var(--color-accent)] hover:bg-text-soft-5 transition-all text-sm font-medium"
      aria-label={locale === 'fa' ? 'English' : 'فارسی'}
    >
      {locale === 'fa' ? 'EN' : 'FA'}
    </button>
  )
}
