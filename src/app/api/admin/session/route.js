import { NextResponse } from 'next/server'
import { checkSession, checkCsrf, clearSessionCookie, bumpSessionEpoch } from '@/lib/admin-auth'
import { recordAudit } from '@/lib/audit'

// GET /api/admin/session — lets the panel restore an existing login after a
// page refresh instead of forcing the whole user+pass+OTP dance again.
export async function GET(request) {
  const valid = await checkSession(request)
  return NextResponse.json({ authenticated: valid }, { status: valid ? 200 : 401 })
}

// DELETE /api/admin/session — logout
export async function DELETE(request) {
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }
  // Bump the epoch so every outstanding session dies with this one — including
  // any copy of the cookie that left the browser before the logout.
  await bumpSessionEpoch()
  await recordAudit({
    action: 'admin.logout',
    entityId: 'session',
    summary: 'خروج از پنل مدیریت — همه‌ی نشست‌ها باطل شد',
  }).catch(() => {})
  return clearSessionCookie(NextResponse.json({ success: true }))
}
