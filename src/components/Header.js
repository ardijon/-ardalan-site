'use client'

import { useState, useEffect, useRef } from 'react'
import ThemeToggle from './ThemeToggle'
import { LogoV1 } from './Logo'
import { useI18n } from '@/lib/i18n/I18nProvider'
import LanguageSwitcher from '@/lib/i18n/languageSwitcher'
import { socialLinks } from '@/lib/socials'

const navHrefs = ['#about', '#services', '#portfolio', '#resume', '#blog', '#contact']

export default function Header() {
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const closeRef = useRef(null)

  const navItems = navHrefs.map(href => ({
    label: t(`header.nav.${href.replace('#', '')}`),
    href,
  }))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768 && menuOpen) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [menuOpen])

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => closeRef.current?.focus(), 100)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    const ids = navHrefs.map(h => h.replace('#', ''))
    const sections = ids.map(id => document.getElementById(id)).filter(Boolean)
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActiveSection(entry.target.id)
      }
    }, { threshold: 0.3, rootMargin: '-100px 0px 0px 0px' })
    sections.forEach(s => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[var(--color-bg)]/80 backdrop-blur-xl shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile layout */}
          <div className="md:hidden flex items-center justify-between h-16 sm:h-20" dir="ltr">
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            <a href="/" className="shrink-0"><LogoV1 /></a>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-[var(--color-text)] rounded-lg hover:bg-[var(--color-text)]/5 transition-colors"
              aria-label={menuOpen ? t('header.closeLabel') : t('header.menuLabel')}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {menuOpen
                  ? <path d="M18 6L6 18M6 6l12 12" />
                  : <path d="M3 12h18M3 6h18M3 18h18" />}
              </svg>
            </button>
          </div>

          {/* Desktop layout */}
          <div className="hidden md:flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            <nav className="flex items-center gap-8" aria-label={t('header.menuLabel')}>
              {navItems.map((item) => {
                const isActive = activeSection === item.href.replace('#', '')
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors relative ${
                      isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]/70 hover:text-[var(--color-accent)]'
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--color-accent)] rounded-full" />
                    )}
                  </a>
                )
              })}
            </nav>

            <a href="/" className="shrink-0"><LogoV1 /></a>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ease-out ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />

        <div
          className={`absolute top-0 bottom-0 right-0 w-72 max-w-[85vw] bg-[var(--color-bg)] border-r border-[var(--color-border)] shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <span className="text-lg font-black text-[var(--color-primary)]">{t('site.brand')}</span>
            <button
              ref={closeRef}
              onClick={() => setMenuOpen(false)}
              className="p-2 -ml-2 text-[var(--color-text)]/50 hover:text-[var(--color-text)] rounded-lg hover:bg-[var(--color-text)]/5 transition-colors"
              aria-label={t('header.closeLabel')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label={t('header.menuLabel')}>
            {navItems.map((item) => {
              const isActive = activeSection === item.href.replace('#', '')
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                    isActive ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'text-[var(--color-text)]/70 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full transition-all ${
                    isActive ? 'bg-[var(--color-accent)] scale-100' : 'bg-[var(--color-text)]/20 scale-0'
                  }`} />
                  {item.label}
                </a>
              )
            })}
          </nav>

          <div className="p-4 border-t border-[var(--color-border)] space-y-3">
            <p className="text-xs text-[var(--color-text)]/30 font-medium tracking-wide">{t('header.social')}</p>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.key}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl border border-[var(--color-border)] text-[var(--color-text)]/40 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 flex items-center justify-center transition-all"
                  aria-label={t(`socialLabels.${social.key}`)}
                >
                  {social.icon()}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
