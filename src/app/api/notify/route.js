import { NextResponse } from 'next/server'
import { addLead } from '@/lib/leads'
import { getLiveProduct } from '@/lib/products-server'
import { extractClientKey } from '@/lib/request-ip'
import { escapeHtml } from '@/lib/markdown'
import { notifyAdmin } from '@/lib/telegram'
import { createRateLimiter } from '@/lib/rate-limit'
import { checkCsrf } from '@/lib/admin-auth'

/**
 * Waitlist signup for an unreleased product.
 *
 * The lead is saved first and the Telegram ping is best-effort afterwards: the
 * signup is the thing worth keeping, and a missing bot token should not make the
 * visitor see an error for something that actually succeeded.
 */

const notifyRateLimiter = createRateLimiter({
  namespace: 'notify',
  maxAttempts: 5,
  windowMs: 60 * 1000,
})

async function pingTelegram({ product, phone, email, duplicate }) {
  const title = product.shortTitle?.fa || product.title?.fa || product.slug
  const lines = [
    duplicate ? '🔔 <b>ثبت‌نام تکراری در لیست انتظار</b>' : '🔔 <b>ثبت‌نام جدید در لیست انتظار</b>',
    '',
    `📦 محصول: ${escapeHtml(title)}`,
    `📞 تلفن: ${escapeHtml(phone)}`,
  ]
  if (email) lines.push(`✉️ ایمیل: ${escapeHtml(email)}`)

  await notifyAdmin(lines, 'notify')
}

export async function POST(request) {
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  if (!(await notifyRateLimiter.check(extractClientKey(request))).allowed) {
    return NextResponse.json(
      { error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const productSlug = String(body?.productSlug || '').trim()
  const phone = String(body?.phone || '').replace(/\s/g, '')
  const email = String(body?.email || '').trim().slice(0, 200)

  if (!productSlug || !phone) {
    return NextResponse.json({ error: 'فیلدهای ضروری را پر کنید' }, { status: 400 })
  }

  if (!/^09\d{9}$/.test(phone)) {
    return NextResponse.json({ error: 'شماره تلفن معتبر نیست' }, { status: 400 })
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'فرمت ایمیل معتبر نیست' }, { status: 400 })
  }

  // Checked against the catalogue so the collection cannot be filled with rows
  // for products that do not exist.
  const product = await getLiveProduct(productSlug)
  if (!product) {
    return NextResponse.json({ error: 'محصول یافت نشد' }, { status: 404 })
  }

  try {
    const { duplicate } = await addLead({
      productSlug,
      phone,
      email,
      source: 'store',
    })

    await pingTelegram({ product, phone, email, duplicate })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lead creation error:', error)
    return NextResponse.json({ error: 'خطا در ثبت درخواست' }, { status: 500 })
  }
}
