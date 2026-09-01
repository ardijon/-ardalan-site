'use client'

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import dictionary from './dictionary'

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function getLocalStorage(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

function setLocalStorage(key, value) {
  try { localStorage.setItem(key, value) } catch {}
}

function applyDir(locale) {
  const dir = locale === 'fa' ? 'rtl' : 'ltr'
  document.documentElement.lang = locale
  document.documentElement.dir = dir
  document.body.style.direction = dir
  // The layout bootstrap sets an inline `direction` on <html> to win the first
  // paint before hydration. React never manages that style, so switching back
  // to fa left a stale `ltr` on the root element — and the root's direction
  // governs things like the scrollbar side. It must be cleared here, or html
  // and body disagree forever after the first en→fa flip.
  document.documentElement.style.direction = ''
}

/**
 * Sync the document's <title> and description meta with the active locale.
 *
 * Used to run only inside toggleLocale, which meant a returning ENGLISH
 * visitor — whose saved locale is applied by the mount effect — read English
 * content under the Persian SSR title and og:description for the whole visit.
 * Now the mount effect calls it too.
 */
function applyDocumentMeta(locale) {
  const site = dictionary[locale]?.site || dictionary.fa.site
  if (site) {
    document.title = site.title || document.title
    const descMeta = document.querySelector('meta[name="description"]')
    if (descMeta && site.description) {
      descMeta.setAttribute('content', site.description)
    }
  }
}

/**
 * The saved locale, or null if the visitor has never picked one.
 *
 * localStorage and not the cookie, and that is the whole point. A middleware used
 * to write NEXT_LOCALE from the Accept-Language header, which meant the cookie
 * answered "what language is this browser configured in" rather than "what did this
 * person choose" — and almost every phone in Iran ships with an English UI, so the
 * Persian site opened in English for its Persian audience. The middleware is gone,
 * but its cookies are still sitting in returning visitors' browsers.
 *
 * Only toggleLocale writes localStorage, so localStorage means a deliberate choice
 * and nothing else. Reading it alone both fixes the default and ignores every
 * cookie the old middleware manufactured.
 */
/**
 * Read the locale that the inline layout script stored in `window.__LOCALE`
 * BEFORE React hydrated. The script reads localStorage('NEXT_LOCALE') and
 * writes it to a global variable so React can read it during its first render
 * without touching DOM attributes that React owns.
 *
 * On the server `window` does not exist, so this returns null and
 * useState falls back to 'fa' — matching the server-rendered HTML.
 * On the client the inline script already set the variable, so we read
 * it back. We do NOT read localStorage directly here because that would
 * produce a different value than the server, breaking hydration.
 */
function savedLocale() {
  try {
    const v = window.__LOCALE
    if (v === 'en' || v === 'fa') return v
  } catch {}
  return null
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  // Always start with 'fa' so the server render and the first client render
  // agree. After hydration, useEffect applies the real locale from localStorage.
  const [locale, setLocale] = useState('fa')
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    const saved = savedLocale()
    if (saved && saved !== locale) {
      setLocale(saved)
      applyDir(saved)
      applyDocumentMeta(saved)
    } else {
      applyDir(locale)
      applyDocumentMeta(locale)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = useCallback((key) => {
    const val = getNested(dictionary[locale], key)
    if (val === undefined) {
      return getNested(dictionary.fa, key) ?? key
    }
    return val
  }, [locale])

  const dir = locale === 'fa' ? 'rtl' : 'ltr'

  const toggleLocale = useCallback(() => {
    const next = locale === 'fa' ? 'en' : 'fa'
    setTransitioning(true)
    setTimeout(() => {
      setLocale(next)
      setLocalStorage('NEXT_LOCALE', next)
      applyDir(next)
      applyDocumentMeta(next)

      setTimeout(() => setTransitioning(false), 50)
    }, 150)
  }, [locale])

  const value = useMemo(() => ({ locale, t, dir, toggleLocale }), [locale, t, dir, toggleLocale])

  return (
    <I18nContext.Provider value={value}>
      <div
        style={{
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        {children}
      </div>
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
