'use client'

import { useEffect, useRef, useState } from 'react'
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
  // The animation always runs FROM the value currently on screen TO the new
  // one. `duration` in the deps used to restart the effect on every hover
  // (About's StatCard passes 800 on hover, 2000 off it), and since `display`
  // restarted from 0 the numbers visibly flashed to zero each time a cursor
  // crossed a card.
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
