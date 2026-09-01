import { NextResponse } from 'next/server'
import { getAllLeads, getLeadStats, markLeadsNotified, unmarkLeadsNotified } from '@/lib/leads'
import { guardAdminRoute } from '@/lib/admin-auth'
import { recordAudit, AUDIT_ACTIONS } from '@/lib/audit'

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
 * Marks leads as notified (or unmarks them).
 *
 * Takes an array of lead IDs and an optional action ('mark' or 'unmark').
 * The default is 'mark' for backward compatibility.
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

  const action = body.action === 'unmark' ? 'unmark' : 'mark'

  try {
    let changed
    if (action === 'unmark') {
      changed = await unmarkLeadsNotified(clean)
    } else {
      changed = await markLeadsNotified(clean)
    }

    // Notifying the waitlist is a business action ("we SMS'd 300 people today")
    // — exactly what the audit log exists to answer later.
    await recordAudit({
      action: action === 'unmark' ? 'lead.unnotify' : 'lead.notify',
      entityId: clean.length === 1 ? clean[0] : `${clean.length} leads`,
      summary: `${AUDIT_ACTIONS[action === 'unmark' ? 'lead.unnotify' : 'lead.notify'].label} — ${changed} مورد`,
    }).catch(() => {})

    return NextResponse.json({ success: true, changed, action })
  } catch (error) {
    console.error('Failed to update leads notified status:', error)
    return NextResponse.json({ error: 'خطا در بروزرسانی سرنخ‌ها' }, { status: 500 })
  }
}