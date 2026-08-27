import { NextResponse } from 'next/server'
import { guardAdminRoute } from '@/lib/admin-auth'
import { recentDayKeys, readDays, summarizeVisits } from '@/lib/visit-stats'

/**
 * Product visit statistics for the dashboard.
 *
 * One KV read per day requested, so the window is capped: 90 days is three
 * Jalali months of history for about 90 reads a load, against a free-tier
 * allowance of a hundred thousand a day. Reads are the cheap resource here —
 * it is writes that are scarce, and this route performs none.
 */

const DEFAULT_DAYS = 90
const MAX_DAYS = 180

export async function GET(request) {
  const denied = await guardAdminRoute(request)
  if (denied) return denied

  const asked = Number(new URL(request.url).searchParams.get('days'))
  const days = Number.isFinite(asked) && asked > 0
    ? Math.min(Math.trunc(asked), MAX_DAYS)
    : DEFAULT_DAYS

  // Oldest first, so the monthly rollup and any future chart read left to right.
  const keys = recentDayKeys(days).reverse()
  const rows = await readDays(keys)

  return NextResponse.json(
    { days: rows, summary: summarizeVisits(rows) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
