import { NextResponse } from 'next/server'
import { getBlob } from '@/lib/blob'
import { guardAdminRoute } from '@/lib/admin-auth'

/**
 * Serves a payment receipt or deployment ZIP to the admin panel.
 *
 * Neither KV values nor R2 objects are publicly reachable, so the file has to
 * be streamed through the app. That is an improvement rather than a workaround:
 * receipts used to be plain static files under /uploads/receipts/, and the
 * filename is built from the order id (which the customer is given) plus a
 * timestamp — so a stranger could plausibly guess the URL of someone else's
 * bank slip.
 *
 * Deployment ZIPs follow the pattern: deploy-ORD-...zip
 *
 * Reads are non-mutating, so no CSRF check — only a valid admin session.
 */

// Mirrors the names produced by the upload route and deployer.
const RECEIPT_FILENAME = /^receipt-[A-Za-z0-9-]+\.(jpg|jpeg|png|webp)$/
const DEPLOY_FILENAME = /^deploy-[A-Za-z0-9-]+\.zip$/
const FILENAME = new RegExp(`(${RECEIPT_FILENAME.source})|(${DEPLOY_FILENAME.source})`)

export async function GET(request, { params }) {
  const denied = await guardAdminRoute(request)
  if (denied) return denied

  const { filename } = await params

  if (!FILENAME.test(filename)) {
    return NextResponse.json({ error: 'نام فایل نامعتبر است' }, { status: 400 })
  }

  const blob = await getBlob(filename)
  if (!blob) {
    return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 })
  }

  const isZip = filename.endsWith('.zip')
  return new Response(blob.body, {
    headers: {
      'Content-Type': blob.contentType || (isZip ? 'application/zip' : 'application/octet-stream'),
      // Financial documents: never let a shared cache hold onto these.
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `${isZip ? 'attachment' : 'inline'}; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
