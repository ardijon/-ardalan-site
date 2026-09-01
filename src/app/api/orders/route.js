import { NextResponse } from 'next/server'
import { createOrder } from '@/lib/orders'
import { getLiveProduct } from '@/lib/products-server'
import { notifyAdmin } from '@/lib/telegram'
import { escapeHtml } from '@/lib/markdown'
import { createRateLimiter } from '@/lib/rate-limit'
import { checkCsrf } from '@/lib/admin-auth'
import { extractClientKey } from '@/lib/request-ip'

const PLAN_LABELS = { starter: 'استارتر', pro: 'حرفه‌ای' }

const orderRateLimiter = createRateLimiter({
  namespace: 'order',
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
})

// Input length caps. Every order POST rewrites the whole orders collection as
// one KV value, so an uncapped field is a per-request amplifier toward KV's
// 25 MB per-value ceiling — past it, EVERY order write fails.
const FIELD_LIMITS = {
  name: 100,
  email: 200,
  domain: 253,
  hostingInfo: 2000,
}

/**
 * Tells the admin an order landed, without waiting to be asked.
 *
 * Payment is a manual bank transfer identified by `uniqueAmount`, so until this
 * existed the only way to learn about a new order was to open the panel and look.
 * A buyer who transferred money and heard nothing for a day is a buyer who asks
 * for it back.
 *
 * `uniqueAmount` is the headline because it is the number that has to be matched
 * against a bank statement — that is also why it is grouped with Latin digits
 * rather than the site's Persian ones: the bank's SMS uses Latin digits, and the
 * whole point is comparing the two at a glance.
 */
async function notifyNewOrder({ order, product, host }) {
  const title = product.shortTitle?.fa || product.title?.fa || product.slug
  const lines = [
    '🛒 <b>سفارش جدید</b>',
    '',
    `💰 مبلغ واریز: <b>${Number(order.uniqueAmount || 0).toLocaleString('en-US')}</b> تومان`,
    `📦 ${escapeHtml(title)} — پلن ${escapeHtml(PLAN_LABELS[order.plan] || order.plan)}`,
    `👤 ${escapeHtml(order.customer?.name || '—')}`,
    `📞 ${escapeHtml(order.customer?.phone || '—')}`,
  ]
  if (order.customer?.email) lines.push(`✉️ ${escapeHtml(order.customer.email)}`)
  lines.push('', `🔖 ${escapeHtml(order.id)}`)
  // Only when the host is known — a relative path is not tappable in Telegram.
  if (host) lines.push(`🔗 https://${escapeHtml(host)}/admin`)

  await notifyAdmin(lines, 'orders')
}

export async function POST(request) {
  // CSRF protection - verify origin matches host
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // Rate limiting
  const ip = extractClientKey(request)
  const rateLimitResult = await orderRateLimiter.check(ip)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 400 })
  }

  try {
    const { productId, plan, customer } = body

    if (!productId || !plan || !customer?.name || !customer?.phone) {
      return NextResponse.json(
        { error: 'فیلدهای ضروری را پر کنید' },
        { status: 400 }
      )
    }

    const validPlans = ['starter', 'pro']
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'پلن نامعتبر است' },
        { status: 400 }
      )
    }

    const product = await getLiveProduct(productId)
    if (!product) {
      return NextResponse.json(
        { error: 'محصول یافت نشد' },
        { status: 404 }
      )
    }

    // A product that refuses money must not be orderable. The old code fell
    // through to `basePrice = 0`, which minted a real tracking code and a real
    // Telegram ping against `0 + random suffix` — an invented price for
    // something the store deliberately does not sell yet.
    if (product.status === 'coming_soon') {
      return NextResponse.json(
        { error: 'این محصول هنوز منتشر نشده است' },
        { status: 400 }
      )
    }
    if (product.pricingMode === 'contact') {
      return NextResponse.json(
        { error: 'این محصول از طریق گفتگوی مستقیم فروخته می‌شود' },
        { status: 400 }
      )
    }

    const phoneRegex = /^09\d{9}$/
    if (!phoneRegex.test(customer.phone)) {
      return NextResponse.json(
        { error: 'شماره تلفن معتبر نیست' },
        { status: 400 }
      )
    }

    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      return NextResponse.json(
        { error: 'فرمت ایمیل معتبر نیست' },
        { status: 400 }
      )
    }

    for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
      const value = customer[field]
      if (typeof value === 'string' && value.length > limit) {
        return NextResponse.json(
          { error: `طول فیلد بیش از حد مجاز است (${limit} نویسه)` },
          { status: 400 }
        )
      }
    }

    const basePrice = product.pricing?.[plan]?.price || 0
    if (!(Number(basePrice) > 0)) {
      return NextResponse.json(
        { error: 'این پلن قابل خرید نیست' },
        { status: 400 }
      )
    }

    const order = await createOrder({ productId, plan, customer, basePrice })

    // Persistence already succeeded — the Telegram ping must not sit on the
    // buyer's response (or fail it when the egress is slow).
    notifyNewOrder({ order, product, host: request.headers.get('host') }).catch(error => {
      console.error('Order notification failed:', error)
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      uniqueAmount: order.uniqueAmount,
      message: 'سفارش با موفقیت ثبت شد',
    })
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: 'خطا در ثبت سفارش' },
      { status: 500 }
    )
  }
}
