import { NextResponse } from 'next/server'
import { getOrderById } from '@/lib/orders'
import { createRateLimiter } from '@/lib/rate-limit'
import { extractClientKey } from '@/lib/request-ip'

const trackRateLimiter = createRateLimiter({
  namespace: 'track',
  maxAttempts: 20,
  windowMs: 5 * 60 * 1000,
})

function getClientIp(request) {
  return extractClientKey(request)
}

export async function POST(request) {
  // Rate limiting
  const ip = getClientIp(request)
  const rateLimitResult = await trackRateLimiter.check(ip)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'تعداد درخواست‌ها بیش از حد مجاز است' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
    )
  }

  try {
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'نوع محتوای نامعتبر' },
        { status: 415 }
      )
    }

    const body = await request.json()
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

    const order = await getOrderById(orderId)
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
        statusHistory: order.statusHistory,
        deployment: order.deployment,
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
