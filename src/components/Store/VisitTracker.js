'use client'

import { useEffect } from 'react'

/**
 * Reports that this product page was opened, and later that it was read.
 *
 * "Read" is deliberately a conjunction, not either half: scrolling past 60% in
 * two seconds is a skim, and 45 seconds parked on the hero is an abandoned tab.
 * Only both together suggest someone actually went through the page, which is
 * the number that says whether the copy works.
 *
 * Renders nothing. Everything is bounded so the endpoint behind it stays cheap:
 * each event fires at most once per half hour per product per browser.
 */

const READ_SCROLL_RATIO = 0.6
const READ_DWELL_MS = 45_000
const SESSION_TTL_MS = 30 * 60 * 1000

/**
 * sessionStorage rather than a ref: a ref forgets on every navigation back to
 * the page, which would count one visitor five times. Every access is wrapped —
 * Safari's private mode throws on access, and losing statistics is acceptable
 * while throwing inside an effect on a product page is not.
 */
function alreadySent(key) {
  try {
    const at = Number(window.sessionStorage.getItem(key))
    return Number.isFinite(at) && at > 0 && Date.now() - at < SESSION_TTL_MS
  } catch {
    return false
  }
}

function markSent(key) {
  try {
    window.sessionStorage.setItem(key, String(Date.now()))
  } catch {
    // Nothing to do: the event still sends, it just may send again next visit.
  }
}

function send(slug, event) {
  const key = `visit:${event}:${slug}`
  if (alreadySent(key)) return

  // Marked before the request settles, on purpose: a failed beacon must not be
  // retried, or a broken endpoint turns every reader into a retry loop.
  markSent(key)

  // Plain fetch, not sendBeacon: `keepalive` already survives the page closing,
  // and this way the request carries the Origin header the route checks.
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, event }),
    keepalive: true,
  }).catch(() => {})
}

export default function VisitTracker({ slug }) {
  useEffect(() => {
    if (!slug) return

    send(slug, 'open')

    const openedAt = Date.now()
    let deepEnough = false
    let readSent = false
    let timer = null

    function stop() {
      if (timer) clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }

    function maybeRead() {
      if (readSent || !deepEnough || Date.now() - openedAt < READ_DWELL_MS) return
      readSent = true
      send(slug, 'read')
      stop()
    }

    function onScroll() {
      const doc = document.documentElement
      const height = doc.scrollHeight
      // A page shorter than the viewport has no depth to reach, so dwell alone
      // decides — otherwise short products could never be counted as read.
      const seen = height > window.innerHeight
        ? (window.scrollY + window.innerHeight) / height
        : 1
      if (seen >= READ_SCROLL_RATIO) deepEnough = true
      maybeRead()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    // The margin keeps the dwell check from failing by a millisecond when the
    // timer fires marginally early and `maybeRead` then refuses to send.
    timer = setTimeout(maybeRead, READ_DWELL_MS + 250)
    onScroll()

    return stop
  }, [slug])

  return null
}
