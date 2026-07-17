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

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState('fa')

  useEffect(() => {
    const saved = getCookie('NEXT_LOCALE')
    if (saved === 'en' || saved === 'fa') {
      setLocale(saved)
      document.documentElement.lang = saved
      document.documentElement.dir = saved === 'fa' ? 'rtl' : 'ltr'
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
    setLocale(next)
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`
    document.documentElement.lang = next
    document.documentElement.dir = next === 'fa' ? 'rtl' : 'ltr'
  }, [locale])

  const value = useMemo(() => ({ locale, t, dir, toggleLocale }), [locale, t, dir, toggleLocale])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
