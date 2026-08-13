import { NextResponse } from 'next/server'
import { createOrder } from '@/lib/orders'
import { getProduct } from '@/lib/products'

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
  // CSRF protection - verify origin matches host
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
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

    const product = getProduct(productId)
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

    const order = await createOrder({ productId, plan, customer })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      message: 'سفارش با موفقیت ثبت شد',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'خطا در ثبت سفارش' },
      { status: 500 }
    )
  }
}
