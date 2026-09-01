'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

/**
 * Release countdown for a product that is not out yet.
 *
 * Stays silent unless it has something true to say: no `releaseAt`, an
 * unparseable one, or a date already gone all render nothing. A timer reading
 * "0 days left" on a product that has not shipped is worse than no timer, and
 * the release dates here are estimates that may well move.
 */
function remaining(target) {
  const ms = target - Date.now()
  if (ms <= 0) return null

  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms / 3600000) % 24),
    minutes: Math.floor((ms / 60000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  }
}

export default function Countdown({ releaseAt }) {
  const { t, locale } = useI18n()
  const [left, setLeft] = useState(null)

  const target = releaseAt ? new Date(releaseAt).getTime() : NaN

  useEffect(() => {
    if (!Number.isFinite(target)) return

    // Server and client never agree on "now", so the first value is only ever
    // computed here — rendering one during SSR would be a hydration mismatch.
    setLeft(remaining(target))
    const id = setInterval(() => setLeft(remaining(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!left) return null

  const units = [
    ['days', left.days],
    ['hours', left.hours],
    ['minutes', left.minutes],
    ['seconds', left.seconds],
  ]

  return (
    <div className="flex items-stretch justify-center gap-2 sm:gap-3" dir="ltr">
      {units.map(([unit, value]) => (
        <div
          key={unit}
          className="flex-1 min-w-[62px] px-2 py-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center"
        >
          <div className="text-2xl font-black text-[var(--color-accent)] tabular-nums">
            {value.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
          </div>
          <div className="mt-0.5 text-[10px] font-medium text-text-soft-50">
            {t(`countdown.${unit}`)}
          </div>
        </div>
      ))}
    </div>
  )
}
