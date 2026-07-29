'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function Countdown({ targetDate }) {
  const { t } = useI18n()
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    function calc() {
      const now = new Date()
      const target = new Date(targetDate)
      const diff = target - now
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      }
    }

    setTimeLeft(calc())
    const timer = setInterval(() => setTimeLeft(calc()), 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (!timeLeft) return null

  const units = [
    { value: timeLeft.days, label: t('countdown.days') || 'روز' },
    { value: timeLeft.hours, label: t('countdown.hours') || 'ساعت' },
    { value: timeLeft.minutes, label: t('countdown.minutes') || 'دقیقه' },
    { value: timeLeft.seconds, label: t('countdown.seconds') || 'ثانیه' },
  ]

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {units.map((unit, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
            <span className="text-2xl sm:text-3xl font-black text-[var(--color-accent)] tabular-nums">
              {String(unit.value).padStart(2, '0')}
            </span>
          </div>
          <span className="mt-2 text-xs text-[var(--color-text)]/50">{unit.label}</span>
        </div>
      ))}
    </div>
  )
}
