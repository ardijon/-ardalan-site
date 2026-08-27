import { NextResponse } from 'next/server'
import { checkSession, checkCsrf, clearSessionCookie } from '@/lib/admin-auth'

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
  return clearSessionCookie(NextResponse.json({ success: true }))
}
