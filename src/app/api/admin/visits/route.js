import { NextResponse } from 'next/server'
import { guardAdminRoute } from '@/lib/admin-auth'
import { recentDayKeys, readDays, summarizeVisits } from '@/lib/visit-stats'

/**
 * Product visit statistics for the dashboard.
 *
 * One KV read per day requested — and each read is a subrequest. Cloudflare
 * caps subrequests per request at 50 on the free plan (1000 on paid), so a
 * 90-day window was exceeding the cap on free deployments and the failure was
 * swallowed client-side into a permanently empty panel. 45 days keeps the
 * dashboard inside the free-plan cap with headroom; a longer horizon needs
 * pre-aggregated buckets, not a bigger cap here.
 */

const DEFAULT_DAYS = 45
const MAX_DAYS = 45

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
