/**
 * How often each product page is opened, and how many of those visits are read.
 *
 * WHY A FIRST-PARTY COUNTER AT ALL
 * --------------------------------
 * Cloudflare Web Analytics already reports pageviews and referrers per path, so
 * this does not duplicate it. It exists for the one question Cloudflare cannot
 * answer: whether a visitor actually *read* the page or bounced off the hero.
 * A product opened 100 times and read 5 is a page problem, not a traffic
 * problem — and that ratio is what the owner needs in their own panel.
 *
 * WHY THE WRITE BUDGET
 * -------------------
 * `admin-auth.js` already argues the case: KV's free tier allows about a
 * thousand writes a day, shared with orders and login. A counter that writes on
 * every request hands an attacker a denial of service — exhaust the quota with a
 * loop and the site can no longer take an order. So writes are bounded three
 * ways: the client sends each event once per session, the route throttles per
 * IP, and this module refuses to write past DAILY_WRITE_BUDGET. The budget lives
 * *inside the day's own document*, so enforcing it costs a read (100k/day, the
 * abundant resource) rather than a second write. Worst case an attacker spoils
 * one day of statistics; the shop keeps working.
 *
 * ONE DOCUMENT PER DAY
 * --------------------
 * Key cardinality is one per day, not one per product per visit, so the KV
 * namespace cannot be grown without bound by anyone. Days are Jalali, because
 * the owner reconciles the month in Jalali and a Gregorian rollup would split
 * every Persian month across two rows. Keys use Latin digits so they sort.
 *
 * KV HAS NO COMPARE-AND-SWAP. Two isolates that both read `opens: 4` both write
 * `5`, so a burst loses counts. Same trade-off `mutateCollection` documents, and
 * acceptable for the same reason: this is a traffic indicator, not accounting.
 * Read the numbers as a floor.
 */

import { getDoc, putDoc } from '@/lib/storage'
import { jalaliParts, JALALI_MONTHS, toPersianDigits } from '@/lib/jalali'

/** The only events accepted. Anything else is a bug or an attacker. */
export const TRACKED_EVENTS = ['open', 'read']

/**
 * Hard ceiling on stats writes per Jalali day.
 *
 * Sized to leave the rest of the daily KV quota for orders, product edits and
 * admin login. Real traffic is far below it; hitting it means either a genuine
 * traffic spike or abuse, and in both cases dropping statistics is the right
 * thing to sacrifice.
 */
export const DAILY_WRITE_BUDGET = 400

// Two years, so a Jalali year-over-year comparison is possible before rollover.
const RETENTION_SECONDS = 2 * 366 * 24 * 60 * 60

const DAY_MS = 24 * 60 * 60 * 1000

const pad = n => String(n).padStart(2, '0')

function docKey(day) {
  return `stats:visits:${day}`
}

/** '1405-06-04' — the Jalali day a timestamp falls on in Tehran, or null. */
export function visitDayKey(at = new Date()) {
  const parts = jalaliParts(at)
  if (!parts) return null
  return `${parts.jy}-${pad(parts.jm)}-${pad(parts.jd)}`
}

/**
 * The last `count` Jalali day keys, newest first.
 *
 * Steps back by exact 24-hour blocks, which is only safe because Iran dropped
 * daylight saving in 2022 — see the fixed offset in lib/jalali.js.
 */
export function recentDayKeys(count, from = new Date()) {
  const start = from instanceof Date ? from.getTime() : new Date(from).getTime()
  if (!Number.isFinite(start) || !(count > 0)) return []

  const keys = []
  for (let i = 0; i < count; i++) {
    const key = visitDayKey(new Date(start - i * DAY_MS))
    if (key) keys.push(key)
  }
  return keys
}

/** Drop anything that is not a positive count — KV values outlive code changes. */
function sanitizeCounts(source) {
  const out = {}
  for (const [slug, value] of Object.entries(source || {})) {
    const count = Number(value)
    if (Number.isFinite(count) && count > 0) out[slug] = Math.trunc(count)
  }
  return out
}

/**
 * Count one event. Callers must have already validated the slug against the
 * live catalogue — this module bounds the *volume* of keys, not their meaning.
 *
 * @returns {Promise<{recorded: boolean, reason: 'ok'|'invalid'|'budget'}>}
 */
export async function recordVisit({ slug, event, at = new Date() }) {
  if (typeof slug !== 'string' || !slug.trim() || !TRACKED_EVENTS.includes(event)) {
    return { recorded: false, reason: 'invalid' }
  }

  const day = visitDayKey(at)
  if (!day) return { recorded: false, reason: 'invalid' }

  const key = docKey(day)
  const stored = await getDoc(key)
  const writes = Number(stored?.writes) || 0

  // Checked after the read that the update needs anyway, so the guard is free.
  if (writes >= DAILY_WRITE_BUDGET) return { recorded: false, reason: 'budget' }

  const bucket = event === 'open' ? 'opens' : 'reads'
  const opens = sanitizeCounts(stored?.opens)
  const reads = sanitizeCounts(stored?.reads)
  const counts = bucket === 'opens' ? opens : reads
  counts[slug] = (counts[slug] || 0) + 1

  await putDoc(key, { day, writes: writes + 1, opens, reads }, { ttlSeconds: RETENTION_SECONDS })
  return { recorded: true, reason: 'ok' }
}

/**
 * Fetch the given days, oldest-first order preserved from the caller.
 *
 * Days with nothing stored come back zeroed rather than missing: a day with no
 * visits is a fact worth plotting, and the caller should not have to reconcile
 * two different lists.
 */
export async function readDays(dayKeys) {
  const keys = Array.isArray(dayKeys) ? dayKeys : []
  const docs = await Promise.all(
    keys.map(day => getDoc(docKey(day)).catch(() => null))
  )

  return docs.map((doc, i) => ({
    day: keys[i],
    opens: sanitizeCounts(doc?.opens),
    reads: sanitizeCounts(doc?.reads),
  }))
}

function monthLabel(key) {
  const match = /^(\d{4})-(\d{2})$/.exec(key || '')
  const month = match ? Number(match[2]) : 0
  if (!match || month < 1 || month > 12) return '—'
  return `${JALALI_MONTHS[month - 1]} ${toPersianDigits(match[1])}`
}

/**
 * Roll daily documents up into per-product and per-month totals.
 *
 * Pure so the aggregation can be tested without storage, and so the admin route
 * can hand the result straight to the panel with no client-side arithmetic.
 */
export function summarizeVisits(docs) {
  const byProduct = {}
  const months = new Map()
  let opens = 0
  let reads = 0

  for (const doc of Array.isArray(docs) ? docs : []) {
    const monthKey = String(doc?.day || '').slice(0, 7)
    const month = months.get(monthKey) || { key: monthKey, label: monthLabel(monthKey), opens: 0, reads: 0 }

    for (const bucket of ['opens', 'reads']) {
      for (const [slug, value] of Object.entries(doc?.[bucket] || {})) {
        const count = Number(value)
        if (!Number.isFinite(count) || count <= 0) continue

        const row = byProduct[slug] || (byProduct[slug] = { opens: 0, reads: 0, readRate: 0 })
        row[bucket] += count
        month[bucket] += count
        if (bucket === 'opens') opens += count
        else reads += count
      }
    }

    if (monthKey) months.set(monthKey, month)
  }

  // Rounded percent, and 0 rather than NaN when nothing was opened — the panel
  // renders this directly and `NaN٪` would look like a bug in the site.
  const rate = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0)
  for (const row of Object.values(byProduct)) row.readRate = rate(row.reads, row.opens)

  return {
    opens,
    reads,
    readRate: rate(reads, opens),
    byProduct,
    byMonth: [...months.values()].sort((a, b) => a.key.localeCompare(b.key)),
  }
}
