'use client'

import { useI18n } from './I18nProvider'

export default function LanguageSwitcher() {
  const { locale, toggleLocale } = useI18n()

  return (
    <button
      onClick={toggleLocale}
      className="p-2 rounded-xl text-[var(--color-text)]/60 hover:text-[var(--color-accent)] hover:bg-[var(--color-text)]/5 transition-all text-sm font-medium"
      aria-label={locale === 'fa' ? 'English' : 'فارسی'}
    >
      {locale === 'fa' ? 'EN' : 'FA'}
    </button>
  )
}
