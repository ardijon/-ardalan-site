import { NextResponse } from 'next/server'
import { checkCsrf } from '@/lib/admin-auth'
import { extractClientKey } from '@/lib/request-ip'
import { getLiveProducts } from '@/lib/products-server'
import { recordVisit, TRACKED_EVENTS } from '@/lib/visit-stats'

/**
 * Public endpoint the product page calls to record that it was opened or read.
 *
 * This is the only unauthenticated route in the app that writes to storage, so
 * every guard here is load-bearing:
 *
 *   - `checkCsrf` — a same-origin `fetch` sends `Origin`, a naive curl loop does
 *     not, so this alone turns most drive-by abuse into a 403.
 *   - the slug must exist in the live catalogue — otherwise a caller could ask
 *     for any string and grow the stored document without limit.
 *   - a per-IP throttle in front of storage, on the pattern admin-auth uses.
 *   - and `recordVisit` refuses to write past its own daily budget.
 *
 * Dropped events answer 204, exactly like accepted ones. There is nothing for
 * the visitor to do about it, and an error would only tell an attacker which
 * limit they have found.
 */

const NO_STORE = { 'Cache-Control': 'no-store' }

// Generous next to the client's own once-per-session dedupe: this is here to
// stop a loop, not to police someone reading three products in ten minutes.
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 40
const PRUNE_AT = 512

/**
 * Per-isolate, deliberately. Persisting it would cost a KV write per request,
 * which is the very thing being defended against — and the daily budget in
 * visit-stats is the backstop that does survive isolate churn.
 */
const hits = new Map()

function pruneStale(now) {
  for (const [key, record] of hits) {
    if (now - record.first > RATE_WINDOW_MS) hits.delete(key)
  }
}

function allow(key) {
  const now = Date.now()
  if (hits.size > PRUNE_AT) pruneStale(now)

  const record = hits.get(key)
  if (!record || now - record.first > RATE_WINDOW_MS) {
    hits.set(key, { count: 1, first: now })
    return true
  }
  record.count += 1
  return record.count <= RATE_MAX
}

export async function POST(request) {
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403, headers: NO_STORE })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: NO_STORE })
  }

  const event = typeof body?.event === 'string' ? body.event : ''
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  if (!TRACKED_EVENTS.includes(event) || !slug) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400, headers: NO_STORE })
  }

  // Before the catalogue read, so a flood costs nothing at all past this point.
  if (!allow(extractClientKey(request))) {
    return new NextResponse(null, { status: 204, headers: NO_STORE })
  }

  try {
    const products = await getLiveProducts()
    if (!products.some(p => p.slug === slug)) {
      return NextResponse.json({ error: 'Unknown product' }, { status: 400, headers: NO_STORE })
    }
    await recordVisit({ slug, event })
  } catch (error) {
    // Statistics are never worth an error on a visitor's page.
    console.error('[track] could not record the visit:', error)
  }

  return new NextResponse(null, { status: 204, headers: NO_STORE })
}
