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
function savedLocale() {
  const saved = getLocalStorage('NEXT_LOCALE')
  return saved === 'en' || saved === 'fa' ? saved : null
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  // Persian unless told otherwise. Server and first client render agree on this,
  // so there is nothing for React to complain about at hydration.
  const [locale, setLocale] = useState('fa')
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    const saved = savedLocale()
    if (saved) setLocale(saved)
    applyDir(saved || 'fa')
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

      // Update page metadata
      const site = dictionary[next]?.site || dictionary.fa.site
      if (site) {
        document.title = site.title || document.title
        const descMeta = document.querySelector('meta[name="description"]')
        if (descMeta && site.description) {
          descMeta.setAttribute('content', site.description)
        }
      }

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
