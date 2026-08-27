import { NextResponse } from 'next/server'
import { getBlob } from '@/lib/blob'
import { guardAdminRoute } from '@/lib/admin-auth'

/**
 * Serves a payment receipt to the admin panel.
 *
 * Neither KV values nor R2 objects are publicly reachable, so the image has to
 * be streamed through the app. That is an improvement rather than a workaround:
 * receipts used to be plain static files under /uploads/receipts/, and the
 * filename is built from the order id (which the customer is given) plus a
 * timestamp — so a stranger could plausibly guess the URL of someone else's
 * bank slip.
 *
 * Reads are non-mutating, so no CSRF check — only a valid admin session.
 */

// Mirrors the names produced by the upload route.
const FILENAME = /^receipt-[A-Za-z0-9-]+\.(jpg|jpeg|png|webp)$/

export async function GET(request, { params }) {
  const denied = await guardAdminRoute(request)
  if (denied) return denied

  const { filename } = await params

  if (!FILENAME.test(filename)) {
    return NextResponse.json({ error: 'نام فایل نامعتبر است' }, { status: 400 })
  }

  const blob = await getBlob(filename)
  if (!blob) {
    return NextResponse.json({ error: 'رسید یافت نشد' }, { status: 404 })
  }

  return new Response(blob.body, {
    headers: {
      'Content-Type': blob.contentType,
      // Financial documents: never let a shared cache hold onto these.
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
