import { NextResponse } from 'next/server'
import { getAllOrders, getOrdersByStatus, updateOrderStatus, getOrderStats } from '@/lib/orders'

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

export async function GET(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'
  const stats = getOrderStats()

  let orders
  if (status === 'all') {
    orders = getAllOrders()
  } else {
    orders = getOrdersByStatus(status)
  }

  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return NextResponse.json({ orders, stats })
}

export async function PATCH(request) {
  // CSRF protection
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { orderId, status, note } = body

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId و status الزامی هستند' },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'awaiting_payment', 'receipt_uploaded', 'approved', 'rejected', 'deploying', 'completed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'وضعیت نامعتبر است' },
        { status: 400 }
      )
    }

    const order = await updateOrderStatus(orderId, status, note || '')
    if (!order) {
      return NextResponse.json(
        { error: 'سفارش یافت نشد' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'خطا در بروزرسانی سفارش' },
      { status: 500 }
    )
  }
}
