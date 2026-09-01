import { NextResponse } from 'next/server'
import { getOrderById } from '@/lib/orders'
import { createRateLimiter } from '@/lib/rate-limit'
import { extractClientKey } from '@/lib/request-ip'

const trackRateLimiter = createRateLimiter({
  namespace: 'track',
  maxAttempts: 20,
  windowMs: 5 * 60 * 1000,
})

export async function POST(request) {
  // Rate limiting
  const ip = extractClientKey(request)
  const rateLimitResult = await trackRateLimiter.check(ip)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'تعداد درخواست‌ها بیش از حد مجاز است' },
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
    const { phone, orderId } = body

    if (!phone || !orderId) {
      return NextResponse.json(
        { error: 'شماره موبایل و کد پیگیری را وارد کنید' },
        { status: 400 }
      )
    }

    const phoneRegex = /^09\d{9}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'شماره تلفن معتبر نیست' },
        { status: 400 }
      )
    }

    const order = await getOrderById(String(orderId).slice(0, 50))
    if (!order || order.customer.phone !== phone) {
      return NextResponse.json(
        { error: 'سفارشی با این اطلاعات یافت نشد' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        product: order.productId,
        plan: order.plan,
        createdAt: order.createdAt,
        uniqueAmount: order.uniqueAmount,
        // Only status + timestamp. `note` is whatever the admin typed in the
        // panel ("رسید مشکوک به جعل است" is not customer-facing content), and
        // `deployment.error` holds internal build output.
        statusHistory: (order.statusHistory || []).map(({ status, at }) => ({ status, at })),
        deployment: order.deployment
          ? {
              status: order.deployment.status,
              startedAt: order.deployment.startedAt,
              completedAt: order.deployment.completedAt,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Order tracking error:', error)
    return NextResponse.json(
      { error: 'خطا در پیگیری سفارش' },
      { status: 500 }
    )
  }
}
