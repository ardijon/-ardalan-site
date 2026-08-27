import { NextResponse } from 'next/server'
import { guardAdminRoute } from '@/lib/admin-auth'
import { translateAll, MAX_BATCH, MAX_TEXT_LENGTH } from '@/lib/translate'

/**
 * Persian → English drafts for the product form.
 *
 * Admin-guarded like every other data route even though it writes nothing: it makes
 * outbound requests on the Worker's behalf, and an open endpoint that does that is
 * someone else's free translation proxy running on this account's quota.
 *
 * `mutating: true` is for the CSRF origin check, not because anything is stored.
 */

export async function POST(request) {
  const denied = await guardAdminRoute(request, { mutating: true })
  if (denied) return denied

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const texts = Array.isArray(body?.texts) ? body.texts : null
  if (!texts) {
    return NextResponse.json({ error: 'texts must be an array' }, { status: 400 })
  }
  if (texts.length > MAX_BATCH) {
    return NextResponse.json({ error: `حداکثر ${MAX_BATCH} متن در هر درخواست` }, { status: 400 })
  }
  if (texts.some(t => typeof t === 'string' && t.length > MAX_TEXT_LENGTH)) {
    return NextResponse.json({ error: 'یکی از متن‌ها بیش از حد بلند است' }, { status: 400 })
  }

  try {
    const results = await translateAll(texts)

    // Logged, not returned: `detail` names the provider and its HTTP status, which
    // is what makes a broken endpoint diagnosable, and none of it belongs in a
    // panel that only ever needs to say "did not work, write it yourself".
    for (const result of results) {
      if (result.error === 'unavailable') console.error('[translate] all providers failed:', result.detail)
    }

    return NextResponse.json({
      results: results.map(({ text, error }) => (error ? { error } : { text })),
    })
  } catch (error) {
    console.error('[translate] batch failed:', error)
    return NextResponse.json({ error: 'سرویس ترجمه در دسترس نیست' }, { status: 502 })
  }
}
