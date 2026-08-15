import { NextResponse } from 'next/server'
import { getOrderById } from '@/lib/orders'

// Rate limiting for order tracking
const trackAttempts = new Map()
const MAX_TRACK_ATTEMPTS = 20
const TRACK_LOCKOUT_TIME = 5 * 60 * 1000 // 5 minutes

function checkTrackRateLimit(ip) {
  const now = Date.now()
  const attempts = trackAttempts.get(ip) || { count: 0, lastAttempt: 0 }

  if (now - attempts.lastAttempt > TRACK_LOCKOUT_TIME) {
    trackAttempts.set(ip, { count: 0, lastAttempt: now })
    return true
  }

  if (attempts.count >= MAX_TRACK_ATTEMPTS) {
    return false
  }

  trackAttempts.set(ip, { count: attempts.count + 1, lastAttempt: now })
  return true
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return '127.0.0.1'
}

export async function POST(request) {
  // Rate limiting
  const ip = getClientIp(request)
  if (!checkTrackRateLimit(ip)) {
    return NextResponse.json(
      { error: 'تعداد درخواست‌ها بیش از حد مجاز است' },
      { status: 429 }
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
