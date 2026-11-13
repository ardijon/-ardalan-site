'use client'

import Link from 'next/link'
import TrustSeal from './TrustSeal'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { socialLinks } from '@/lib/socials'

export default function Footer() {
  const { t } = useI18n()
  const currentYear = new Date().getFullYear()

  // Absolute "/#section" hrefs so the links work from /blog and /store too,
  // not only when the footer is rendered on the homepage.
  const sectionLinks = [
    { href: '/#about', label: t('header.nav.about') },
    { href: '/#products', label: t('header.nav.products') },
    { href: '/#services', label: t('header.nav.services') },
    { href: '/blog', label: t('header.nav.blog') },
    { href: '/store', label: t('header.nav.store') },
    { href: '/#contact', label: t('header.nav.contact') },
  ]

  const quickLinks = [
    { href: '/store/track', label: t('store.trackOrder') },
    { href: '/#contact', label: t('hero.cta2') },
  ]

  return (
    <footer className="relative border-t border-[var(--color-border)] bg-surface-soft">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <TrustSeal size={40} />
              <span className="text-xl font-black text-[var(--color-primary)]">{t('site.brand')}</span>
            </div>
            <p className="mt-4 text-sm text-text-soft-50 leading-relaxed max-w-sm">
              {t('footer.bio')}
            </p>
            <div className="mt-6">
              <h4 className="text-sm font-bold text-[var(--color-text)] mb-3">{t('footer.social')}</h4>
              <div className="flex flex-wrap gap-2.5">
                {socialLinks.map((social) => (
                  <a
                    key={social.key}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-11 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-text-soft-60 hover:text-[var(--color-accent)] hover:border-accent-soft-30 transition-all"
                    aria-label={t(`socialLabels.${social.key}`)}
                  >
                    {social.icon()}
                    <span>{t(`socialLabels.${social.key}`)}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <nav aria-label={t('footer.sections')}>
            <h4 className="text-sm font-bold text-[var(--color-text)] mb-4">{t('footer.sections')}</h4>
            <ul className="space-y-1">
              {sectionLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-2 py-1.5 text-sm text-text-soft-50 hover:text-[var(--color-accent)] transition-colors"
                  >
                    <span className="w-1 h-1 rounded-full bg-accent-soft-40" aria-hidden="true" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h4 className="text-sm font-bold text-[var(--color-text)] mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-1">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-2 py-1.5 text-sm text-text-soft-50 hover:text-[var(--color-accent)] transition-colors"
                  >
                    <span className="w-1 h-1 rounded-full bg-tech-soft-30" aria-hidden="true" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-3">
              <div className="p-2 w-fit rounded-xl bg-white shadow-sm border border-[var(--color-border)]">
                <img src="/qr-site.svg" width={80} height={80} alt={t('footer.qrAlt')} />
              </div>
              <p className="text-xs text-text-soft-50 leading-relaxed max-w-28">{t('footer.qrLabel')}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-text-soft-50">
            &copy; {currentYear} &mdash; {t('site.brand')}. {t('site.copyright')}
          </p>
          <p className="text-xs text-text-soft-40">{t('site.madeWith')}</p>
        </div>
      </div>
    </footer>
  )
}
