import { NextResponse } from 'next/server'
import { getOrderById } from '@/lib/orders'

export async function POST(request) {
  try {
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

    const order = getOrderById(orderId)
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
    return NextResponse.json(
      { error: 'خطا در پیگیری سفارش' },
      { status: 500 }
    )
  }
}
