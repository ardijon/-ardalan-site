'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
function toLocalizedNum(n, locale) {
  if (locale === 'en') return String(n)
  return String(n).split('').map(d => FA_DIGITS[parseInt(d, 10)] ?? d).join('')
}

export default function AnimatedCounter({ value, prefix = '', suffix = '', duration = 2000 }) {
  const [display, setDisplay] = useState(0)
  const { locale } = useI18n()
  // The animation always runs FROM the value currently on screen TO the new
  // one, so a value or duration change mid-count never flashes back to zero.
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      fromRef.current = value
      return
    }

    const startTime = performance.now()
    let raf
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = progress >= 1 ? value : Math.floor(from + eased * (value - from))
      setDisplay(current)
      if (progress < 1) raf = requestAnimationFrame(animate)
      else fromRef.current = value
    }
    raf = requestAnimationFrame(animate)
    return () => { if (raf) cancelAnimationFrame(raf) }
  }, [value, duration])

  return <>{prefix}{toLocalizedNum(display, locale)}{suffix}</>
}
