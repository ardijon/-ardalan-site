'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { LogoV1 } from './Logo'
import { useI18n } from '@/lib/i18n/I18nProvider'
import LanguageSwitcher from '@/lib/i18n/languageSwitcher'
import { socialLinks } from '@/lib/socials'

/**
 * Anchor sections only, in the order they appear on the landing page.
 *
 * The store used to be an equal-weight item here, which is how the only page
 * that sells anything ended up looking like a footnote. It now gets a CTA button
 * of its own (STORE_HREF below) and is deliberately absent from this list.
 *
 * Portfolio and Resume were removed from the landing page entirely, and Blog was
 * relocated to its own route (/blog) — so Blog is a page link spliced into the
 * nav below, not an anchor. Order tracking is an after-sale tool and lives in the
 * footer.
 */
const navSections = ['about', 'products', 'services', 'contact']

const STORE_HREF = '/store'
const BLOG_HREF = '/blog'

export default function Header() {
  const { t } = useI18n()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const closeRef = useRef(null)
  const menuTimeoutRef = useRef(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current)
    }
  }, [])

  const isHome = pathname === '/'
  const storeActive = Boolean(pathname?.startsWith('/store'))

  // Off the landing page a bare `#about` resolves against the current route, so
  // clicking it on /store asked for /store#about and did nothing.
  const anchorItems = navSections.map(id => ({
    id,
    href: isHome ? `#${id}` : `/#${id}`,
    label: t(`header.nav.${id}`),
  }))
  // Blog is a page now, not a section. Splice it back between Services and
  // Contact so the nav keeps the order visitors already know.
  const navItems = [
    ...anchorItems.slice(0, 3),
    { id: 'blog', href: BLOG_HREF, label: t('header.nav.blog'), route: true },
    ...anchorItems.slice(3),
  ]

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
      menuTimeoutRef.current = setTimeout(() => closeRef.current?.focus(), 100)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current)
    }
  }, [menuOpen])

  useEffect(() => {
    // Anchors only. The old version mapped the full nav list, so on /store it
    // called getElementById('/store'), observed nothing, and left every item
    // unhighlighted while the store button had no active state at all.
    //
    // Re-runs on `isHome`: this effect used to run once at mount, so arriving
    // from /store via a client-side Link — where the sections mount AFTER the
    // effect had already resolved an empty list — left every nav item
    // unhighlighted for the rest of the session.
    if (!isHome) return undefined
    const sections = navSections.map(id => document.getElementById(id)).filter(Boolean)
    if (sections.length === 0) return undefined
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActiveSection(entry.target.id)
      }
    }, { threshold: 0.3, rootMargin: '-100px 0px 0px 0px' })
    sections.forEach(s => observer.observe(s))
    return () => observer.disconnect()
  }, [isHome])

  // Escape closes the drawer; while closed the whole menu is removed from the
  // tab order — it used to hide with opacity only, so Tab walked into every
  // invisible link sitting on top of the page content.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled ? 'bg-page-soft-80 backdrop-blur-xl shadow-sm' : 'bg-transparent'
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
              className="w-11 h-11 flex items-center justify-center text-[var(--color-text)] rounded-lg hover:bg-text-soft-5 transition-colors"
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

            <nav className="flex items-center gap-6 lg:gap-8" aria-label={t('header.menuLabel')}>
              {navItems.map((item) => {
                const isActive = item.route ? Boolean(pathname?.startsWith(item.href)) : (isHome && activeSection === item.id)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors relative ${
                      isActive ? 'text-[var(--color-accent)]' : 'text-text-soft-70 hover:text-[var(--color-accent)]'
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--color-accent)] rounded-full" />
                    )}
                  </Link>
                )
              })}

              {/* The one visually loud element in the header. Everything else is
                  navigation; this is the conversion path. */}
              <Link
                href={STORE_HREF}
                aria-current={storeActive ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all active:scale-95 ${
                  storeActive
                    ? 'text-white bg-[var(--color-accent)] shadow-md shadow-accent-soft-25'
                    : 'text-[var(--color-accent)] border border-accent-soft-40 hover:text-white hover:bg-[var(--color-accent)] hover:border-[var(--color-accent)]'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
                </svg>
                {t('header.nav.store')}
              </Link>
            </nav>

            <a href="/" className="shrink-0"><LogoV1 /></a>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ease-out ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none invisible'
        }`}
        aria-hidden={!menuOpen}
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
              className="w-11 h-11 -ml-2 flex items-center justify-center text-text-soft-50 hover:text-[var(--color-text)] rounded-lg hover:bg-text-soft-5 transition-colors"
              aria-label={t('header.closeLabel')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label={t('header.menuLabel')}>
            {/* The store CTA leads on mobile too: on a phone the visitor sees
                three items before scrolling, so burying it sixth would hide it. */}
            <Link
              href={STORE_HREF}
              onClick={() => setMenuOpen(false)}
              aria-current={storeActive ? 'page' : undefined}
              className={`mb-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-bold transition-all ${
                storeActive
                  ? 'text-white bg-[var(--color-accent)]'
                  : 'text-[var(--color-accent)] border border-accent-soft-40 hover:text-white hover:bg-[var(--color-accent)]'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
              </svg>
              {t('header.nav.store')}
            </Link>

            {navItems.map((item) => {
              const isActive = item.route ? Boolean(pathname?.startsWith(item.href)) : (isHome && activeSection === item.id)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                    isActive ? 'text-[var(--color-accent)] bg-accent-soft-10' : 'text-text-soft-70 hover:text-[var(--color-accent)] hover:bg-accent-soft-5'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full transition-all ${
                    isActive ? 'bg-[var(--color-accent)] scale-100' : 'bg-text-soft-20 scale-0'
                  }`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-[var(--color-border)] space-y-3">
            <p className="text-xs text-text-soft-30 font-medium tracking-wide">{t('header.social')}</p>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.key}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-xl border border-[var(--color-border)] text-text-soft-40 hover:text-[var(--color-accent)] hover:border-accent-soft-30 flex items-center justify-center transition-all"
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
