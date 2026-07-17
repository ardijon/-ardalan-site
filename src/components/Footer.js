'use client'

import { useState, useEffect } from 'react'
import TrustSeal from './TrustSeal'
import VisitorCounter from './VisitorCounter'
import QRCodeSVG from './QRCodeSVG'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { socialLinks } from '@/lib/socials'
import { SITE_URL } from '@/lib/constants'

export default function Footer() {
  const { t, locale } = useI18n()
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())
  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [locale])

  return (
    <footer className="py-10 sm:py-14 border-t border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3">
              <TrustSeal size={36} />
              <span className="text-lg font-bold text-[var(--color-primary)]">Ardalan</span>
            </div>
            <p className="mt-3 text-sm text-[var(--color-text)]/40 leading-relaxed">
              {t('site.tagline')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-6 sm:gap-8 lg:gap-6">
            <div>
              <h4 className="text-sm font-bold text-[var(--color-text)] mb-3">{t('footer.social')}</h4>
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.key}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl border border-[var(--color-border)] text-[var(--color-text)]/40 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 flex items-center justify-center transition-all"
                    aria-label={t(`socialLabels.${social.key}`)}
                  >
                    {social.icon()}
                  </a>
                ))}
              </div>
            </div>
            <div className="p-2 inline-block w-fit rounded-xl bg-white dark:bg-white shadow-sm">
              <QRCodeSVG value={SITE_URL} size={90} />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-text)]/30">
            &copy; {currentYear} &mdash; Ardalan. {t('site.copyright')}
          </p>
          <VisitorCounter />
          <p className="text-xs text-[var(--color-text)]/20">
            {t('site.madeWith')}
          </p>
        </div>
      </div>
    </footer>
  )
}
