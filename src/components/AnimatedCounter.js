'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

function toLocalizedNum(n, locale) {
  if (locale === 'en') return String(n)
  const digits = locale === 'ar' ? AR_DIGITS : FA_DIGITS
  return String(n).split('').map(d => digits[parseInt(d, 10)] ?? d).join('')
}

export default function AnimatedCounter({ value, prefix = '', suffix = '', duration = 2000 }) {
  const [display, setDisplay] = useState(0)
  const { locale } = useI18n()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }

    const startTime = performance.now()
    let raf
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = progress >= 1 ? value : Math.floor(eased * value)
      setDisplay(current)
      if (progress < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => { if (raf) cancelAnimationFrame(raf) }
  }, [value, duration])

  return <>{prefix}{toLocalizedNum(display, locale)}{suffix}</>
}
