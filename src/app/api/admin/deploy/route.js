import { NextResponse } from 'next/server'
import { getOrderById } from '@/lib/orders'
import { deployProduct } from '@/lib/deployer'

const ADMIN_USER = process.env.ADMIN_USER
const ADMIN_PASS = process.env.ADMIN_PASS

function checkAuth(request) {
  const auth = request.headers.get('authorization')
  if (!auth || !auth.startsWith('Basic ')) return false
  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString()
  const [user, pass] = decoded.split(':')
  return user === ADMIN_USER && pass === ADMIN_PASS
}

function checkCsrf(request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false
  try {
    const originHost = new URL(origin).host
    return originHost === host
  } catch {
    return false
  }
}

export async function POST(request) {
  // CSRF protection
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId الزامی است' },
        { status: 400 }
      )
    }

    const order = getOrderById(orderId)
    if (!order) {
      return NextResponse.json(
        { error: 'سفارش یافت نشد' },
        { status: 404 }
      )
    }

    if (order.status !== 'approved') {
      return NextResponse.json(
        { error: 'فقط سفارشات تایید شده قابل دیپلوی هستند' },
        { status: 400 }
      )
    }

    const result = await deployProduct(orderId, {
      productId: order.productId,
      domain: order.customer?.domain,
      hostingInfo: order.customer?.hostingInfo,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'دیپلوی با موفقیت انجام شد',
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'خطا در اجرای دیپلوی' },
      { status: 500 }
    )
  }
}
