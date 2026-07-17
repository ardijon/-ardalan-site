'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import AnimatedCounter from './AnimatedCounter'

const COUNTER_URL = process.env.NEXT_PUBLIC_COUNTER_URL || '/api/visitors'
const LOCAL_KEY = 'visitor_local_count'

function readLocal() {
  if (typeof window === 'undefined') return 0
  try {
    const n = parseInt(window.localStorage.getItem(LOCAL_KEY) || '0', 10)
    return Number.isFinite(n) ? n : 0
  } catch { return 0 }
}
function writeLocal(n) {
  try { window.localStorage.setItem(LOCAL_KEY, String(n)) } catch { /* ignore */ }
}

export default function VisitorCounter() {
  const { t } = useI18n()
  const [total, setTotal] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function track() {
      try {
        const counted = sessionStorage.getItem('visitor_counted')
        const method = counted ? 'GET' : 'POST'
        const res = await fetch(COUNTER_URL, { method })
        if (!res.ok) throw new Error('counter unreachable')
        const data = await res.json()
        if (cancelled) return
        setTotal(typeof data.total === 'number' ? data.total : 0)
        sessionStorage.setItem('visitor_counted', '1')
      } catch {
        if (cancelled) return
        const next = readLocal() + 1
        writeLocal(next)
        setTotal(next)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    track()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm text-[var(--color-text)]/40">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="opacity-50"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <span>
        {loaded ? (
          <>
            <AnimatedCounter value={total} duration={2000} />
            {' '}{t('visitor.label')}
          </>
        ) : (
          <span className="animate-pulse">...</span>
        )}
      </span>
    </div>
  )
}
