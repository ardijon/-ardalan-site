import { NextResponse } from 'next/server'
import { getOrderById } from '@/lib/orders'
import { deployProduct } from '@/lib/deployer'
import { guardAdminRoute } from '@/lib/admin-auth'
import { recordAudit, auditSummary, AUDIT_ACTORS } from '@/lib/audit'

export async function POST(request) {
  const denied = await guardAdminRoute(request, { mutating: true })
  if (denied) return denied

  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId الزامی است' },
        { status: 400 }
      )
    }

    const order = await getOrderById(orderId)
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

    let result
    try {
      result = await deployProduct(orderId, {
        productId: order.productId,
        domain: order.customer?.domain,
        hostingInfo: order.customer?.hostingInfo,
        plan: order.plan,
      })
    } catch (error) {
      // A throw from the deployer is a failed deploy like any other, and it is
      // caught here rather than below so it still gets audited — in the outer
      // catch `order` is out of scope, so there would be nothing to name.
      console.error('Deploy threw:', error)
      result = { success: false, error: error?.message || 'خطای نامشخص' }
    }

    /**
     * The actor is `system`, not the admin who pressed the button.
     *
     * What this row records is the outcome of the pipeline, not the click — the
     * admin asking for a deploy and the deploy failing forty seconds later are two
     * different facts, and attributing the failure to a person reads as though they
     * did something wrong.
     */
    await recordAudit({
      action: result.success ? 'order.deploy' : 'order.deploy_failed',
      actor: AUDIT_ACTORS.SYSTEM,
      entityId: order.id,
      summary: auditSummary.deploy(order, { error: result.success ? null : result.error }),
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'دیپلوی با موفقیت انجام شد',
        downloadUrl: result.downloadUrl || null,
      })
    }

    return NextResponse.json({
      success: false,
      error: result.error,
    }, { status: 500 })
  } catch (error) {
    console.error('Deploy route error:', error)
    return NextResponse.json(
      { error: 'خطا در اجرای دیپلوی' },
      { status: 500 }
    )
  }
}
