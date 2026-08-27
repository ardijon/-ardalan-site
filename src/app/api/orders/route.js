import { NextResponse } from 'next/server'
import { createOrder } from '@/lib/orders'
import { getLiveProduct } from '@/lib/products-server'
import { notifyAdmin } from '@/lib/telegram'
import { escapeHtml } from '@/lib/markdown'

// Rate limiting for order creation
const orderAttempts = new Map()
const MAX_ORDER_ATTEMPTS = 10
const ORDER_LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes

const PLAN_LABELS = { starter: 'استارتر', pro: 'حرفه‌ای' }

function checkOrderRateLimit(ip) {
  const now = Date.now()
  const attempts = orderAttempts.get(ip) || { count: 0, lastAttempt: 0 }

  if (now - attempts.lastAttempt > ORDER_LOCKOUT_TIME) {
    orderAttempts.set(ip, { count: 0, lastAttempt: now })
    return true
  }

  if (attempts.count >= MAX_ORDER_ATTEMPTS) {
    return false
  }

  orderAttempts.set(ip, { count: attempts.count + 1, lastAttempt: now })
  return true
}

function checkCsrf(request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false
  try {
    const originHost = new URL(origin).host
    if (process.env.NODE_ENV === 'production' && new URL(origin).protocol !== 'https:') {
      return false
    }
    return originHost === host
  } catch {
    return false
  }
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return '127.0.0.1'
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
  const ip = getClientIp(request)
  if (!checkOrderRateLimit(ip)) {
    return NextResponse.json(
      { error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
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

    const basePrice = product.pricing?.[plan]?.price || 0
    const order = await createOrder({ productId, plan, customer, basePrice })

    // notifyAdmin swallows its own failures, so a Telegram outage cannot turn a
    // saved order into a 500 that tells the buyer to try again.
    await notifyNewOrder({ order, product, host: request.headers.get('host') })

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
