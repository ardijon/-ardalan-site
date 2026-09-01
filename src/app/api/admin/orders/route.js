import { NextResponse } from 'next/server'
import { getAllOrders, getOrdersByStatus, updateOrderStatus, getOrderStats, canTransitionOrder } from '@/lib/orders'
import { ORDER_STATUS_KEYS } from '@/lib/order-status'
import { guardAdminRoute } from '@/lib/admin-auth'

export async function GET(request) {
  const denied = await guardAdminRoute(request)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'
  const search = searchParams.get('search') || ''

  const stats = await getOrderStats()

  let orders
  if (status === 'all') {
    orders = await getAllOrders()
  } else {
    orders = await getOrdersByStatus(status)
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    orders = orders.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.customer?.phone?.includes(q) ||
      o.customer?.name?.toLowerCase().includes(q)
    )
  }

  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return NextResponse.json({ orders, stats })
}

export async function PATCH(request) {
  const denied = await guardAdminRoute(request, { mutating: true })
  if (denied) return denied

  try {
    const body = await request.json()
    const { orderId, status, note } = body

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId و status الزامی هستند' },
        { status: 400 }
      )
    }

    // Shared with the panel's labels, so a status this route accepts is always a
    // status the panel can name. The two lists used to be written out separately.
    if (!ORDER_STATUS_KEYS.includes(status)) {
      return NextResponse.json(
        { error: 'وضعیت نامعتبر است' },
        { status: 400 }
      )
    }

    // Forward-only pipeline: an accidental completed → rejected must be a 400 at
    // the API, not just a suspicious row in the audit feed.
    const current = (await getAllOrders()).find(o => o.id === orderId)
    if (current && !canTransitionOrder(current.status, status)) {
      return NextResponse.json(
        { error: `گذار از «${current.status}» به «${status}» مجاز نیست` },
        { status: 400 }
      )
    }

    // The audit entry is written inside updateOrderStatus — see the note there.
    const order = await updateOrderStatus(orderId, status, note || '')
    if (!order) {
      return NextResponse.json(
        { error: 'سفارش یافت نشد' },
        { status: 404 }
      )
    }

    if (order.error === 'illegal_transition') {
      return NextResponse.json(
        { error: `گذار از «${order.from}» به «${order.to}» مجاز نیست` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error) {
    console.error('Failed to update order:', error)
    return NextResponse.json(
      { error: 'خطا در بروزرسانی سفارش' },
      { status: 500 }
    )
  }
}
