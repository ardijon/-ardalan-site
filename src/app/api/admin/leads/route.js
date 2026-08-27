import { NextResponse } from 'next/server'
import { getAllLeads, getLeadStats, markLeadsNotified } from '@/lib/leads'
import { guardAdminRoute } from '@/lib/admin-auth'

/**
 * Waitlist rows for the panel's leads tab.
 *
 * Filtering happens here rather than in the client so the response for a single
 * product stays small — the phone list is the thing that gets copied out, and
 * shipping every lead for every product just to filter five of them in the browser
 * is wasted payload on a connection that may be a phone tether.
 */

export async function GET(request) {
  const denied = await guardAdminRoute(request)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const product = searchParams.get('product') || 'all'
  const status = searchParams.get('status') || 'all'
  const search = (searchParams.get('search') || '').trim()

  // Stats are always over the whole collection, never the filtered slice: the
  // per-product counts are how the admin decides which filter to apply next.
  const stats = await getLeadStats()

  let leads = await getAllLeads()

  if (product !== 'all') leads = leads.filter(l => l.productSlug === product)
  if (status === 'pending') leads = leads.filter(l => !l.notifiedAt)
  if (status === 'notified') leads = leads.filter(l => l.notifiedAt)

  if (search) {
    const q = search.toLowerCase()
    leads = leads.filter(l =>
      l.phone?.includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.id?.toLowerCase().includes(q)
    )
  }

  // Newest first, matching the orders list.
  leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return NextResponse.json({ leads, stats })
}

/**
 * Marks leads as notified.
 *
 * Takes an array, not a single id, because the announcement goes out as one bulk
 * SMS and the panel has to be able to record that in one action — see
 * markLeadsNotified() for why the batch is a single write.
 */
export async function PATCH(request) {
  const denied = await guardAdminRoute(request, { mutating: true })
  if (denied) return denied

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ids = Array.isArray(body?.leadIds)
    ? body.leadIds
    : body?.leadId
      ? [body.leadId]
      : []

  const clean = ids.filter(id => typeof id === 'string' && id.length > 0)
  if (clean.length === 0) {
    return NextResponse.json({ error: 'شناسه‌ای ارسال نشد' }, { status: 400 })
  }

  try {
    const changed = await markLeadsNotified(clean)
    // `changed` can legitimately be less than what was sent — ids that no longer
    // exist, or leads someone else already marked. The caller is told the real
    // number rather than being led to believe every row moved.
    return NextResponse.json({ success: true, changed })
  } catch (error) {
    console.error('Failed to mark leads notified:', error)
    return NextResponse.json({ error: 'خطا در بروزرسانی سرنخ‌ها' }, { status: 500 })
  }
}
