import { NextResponse } from 'next/server'
import { guardAdminRoute } from '@/lib/admin-auth'
import { readAudit, AUDIT_ACTIONS } from '@/lib/audit'

/**
 * The change log, newest first.
 *
 * Read-only on purpose: there is no POST, PUT or DELETE here and there should never
 * be one. A log the panel can edit is not a log — entries are written by the code
 * that performed the action, which is the only thing that knows it actually happened.
 *
 * `AUDIT_ACTIONS` rides along in the response so the panel gets its labels and tone
 * colours from the same table the server validates against. Shipping them in the
 * client bundle instead would let the two drift, and the symptom of that drift is an
 * unlabelled row — the least useful possible outcome for a log.
 */
export async function GET(request) {
  const denied = await guardAdminRoute(request)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit')) || 50
  const action = searchParams.get('action')

  // `readAudit` clamps the limit and swallows storage failures, so there is no
  // try/catch here — an unreadable log returns an empty list rather than a 500,
  // which keeps a KV hiccup from blanking the whole dashboard.
  const entries = await readAudit({
    limit,
    action: AUDIT_ACTIONS[action] ? action : null,
  })

  return NextResponse.json({ entries, actions: AUDIT_ACTIONS })
}
