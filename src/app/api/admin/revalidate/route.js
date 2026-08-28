import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { guardAdminRoute } from '@/lib/admin-auth'

/**
 * POST /api/admin/revalidate
 *
 * Force-cache invalidation for store pages. Call this after a deploy to ensure
 * the latest product data is served, or when incremental cache serves stale
 * content that revalidatePath from product edits did not clear.
 *
 * Requires admin session.
 */
export async function POST(request) {
  const denied = await guardAdminRoute(request, { mutating: true })
  if (denied) return denied

  try {
    revalidatePath('/store')
    revalidatePath('/store/[slug]', 'page')
    revalidatePath('/sitemap.xml')

    return NextResponse.json({
      revalidated: true,
      paths: ['/store', '/store/[slug]', '/sitemap.xml'],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[revalidate] failed:', error)
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
