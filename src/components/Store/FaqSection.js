'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

const faqItems = [
  {
    q: 'faq.q1',
    a: 'faq.a1',
  },
  {
    q: 'faq.q2',
    a: 'faq.a2',
  },
  {
    q: 'faq.q3',
    a: 'faq.a3',
  },
  {
    q: 'faq.q4',
    a: 'faq.a4',
  },
  {
    q: 'faq.q5',
    a: 'faq.a5',
  },
]

function FaqItem({ item, isOpen, onToggle }) {
  const { t, locale } = useI18n()

  return (
    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-right hover:bg-[var(--color-surface)] transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-bold text-[var(--color-primary)]">
          {t(item.q)}
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 text-[var(--color-text)]/40 transition-transform duration-200 ${
            locale === 'rtl' ? 'rotate-180' : ''
          } ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-4 text-sm text-[var(--color-text)]/60 leading-relaxed">
          {t(item.a)}
        </div>
      </div>
    </div>
  )
}

export default function FaqSection() {
  const { t } = useI18n()
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
            {t('faq.badge')}
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-[var(--color-primary)]">
            {t('faq.title')}
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <FaqItem
              key={i}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
