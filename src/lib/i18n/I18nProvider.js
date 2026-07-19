'use client'

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import dictionary from './dictionary'

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function getCookie(name) {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}

function setCookie(name, value) {
  document.cookie = `${name}=${value};path=/;max-age=31536000;SameSite=Lax`
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

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState('fa')
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    const saved = getCookie('NEXT_LOCALE') || getLocalStorage('NEXT_LOCALE')
    if (saved === 'en' || saved === 'fa') {
      setLocale(saved)
      applyDir(saved)
    } else {
      applyDir('fa')
    }
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
      setCookie('NEXT_LOCALE', next)
      setLocalStorage('NEXT_LOCALE', next)
      applyDir(next)
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
