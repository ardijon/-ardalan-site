import { NextResponse } from 'next/server'
import { uploadReceipt, getOrderById } from '@/lib/orders'
import { putBlob, deleteBlob } from '@/lib/blob'

/**
 * Customer-facing receipt upload.
 *
 * The bytes go through the blob layer (KV in production today, public/uploads/
 * locally) instead of `fs.writeFile`. Writing directly to the filesystem
 * returned 200 on Cloudflare Workers but persisted nothing, so the admin could
 * never see the receipt and could not verify the payment. See src/lib/blob.js.
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const MAX_SIZE = 5 * 1024 * 1024

// Validate order ID format (alphanumeric + hyphens only)
function isValidOrderId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9-]+$/.test(id) && id.length <= 50
}

/**
 * Validate receipt amount against order's uniqueAmount.
 * Allows ±10% tolerance for bank fees/rounding, but rejects wildly different amounts.
 */
function validateReceiptAmount(receiptAmount, expectedAmount) {
  if (!receiptAmount || receiptAmount <= 0) {
    return { valid: false, error: 'مبلغ رسید باید بزرگتر از صفر باشد' }
  }
  if (!expectedAmount || expectedAmount <= 0) {
    return { valid: false, error: 'مبلغ انتظاری سفارش نامعتبر است' }
  }

  const diff = Math.abs(receiptAmount - expectedAmount)
  const tolerance = expectedAmount * 0.1 // 10% tolerance

  if (diff > tolerance) {
    return {
      valid: false,
      error: `مبلغ رسید (${receiptAmount.toLocaleString('fa-IR')} تومان) با مبلغ سفارش (${expectedAmount.toLocaleString('fa-IR')} تومان) مطابقت ندارد. تفاوت مجاز: ±${tolerance.toLocaleString('fa-IR')} تومان`
    }
  }
  return { valid: true }
}

export async function POST(request, { params }) {
  // Tracked so any failure after the write removes the orphaned blob.
  let storedName = null

  try {
    const { id } = await params

    // Validate order ID format to prevent path traversal
    if (!isValidOrderId(id)) {
      return NextResponse.json({ error: 'شناسه سفارش نامعتبر است' }, { status: 400 })
    }

    // Verify the order exists before allowing upload
    const existingOrder = await getOrderById(id)
    if (!existingOrder) {
      return NextResponse.json({ error: 'سفارش یافت نشد' }, { status: 404 })
    }

    // Check order status before processing
    if (existingOrder.status !== 'awaiting_payment') {
      return NextResponse.json(
        { error: 'رسید فقط برای سفارشات در انتظار پرداخت قابل آپلود است' },
        { status: 400 }
      )
    }

    // A missing or malformed multipart body makes formData() throw. That is the
    // client's mistake, so it must not fall through to the catch below, which
    // would answer 500 «خطا در آپلود رسید» and make a bad request look like the
    // server being broken.
    let formData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 400 })
    }

    const file = formData.get('receipt')
    const amount = formData.get('amount')
    const trackingCode = formData.get('trackingCode')

    if (!file) {
      return NextResponse.json({ error: 'فایل رسید را انتخاب کنید' }, { status: 400 })
    }

    // Server-side amount validation against order's uniqueAmount
    const receiptAmount = amount ? parseInt(amount) : 0
    const expectedAmount = existingOrder.uniqueAmount || 0
    const amountValidation = validateReceiptAmount(receiptAmount, expectedAmount)
    if (!amountValidation.valid) {
      return NextResponse.json({ error: amountValidation.error }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'فرمت فایل معتبر نیست (فقط JPG, PNG, WebP)' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'حجم فایل حداکثر 5MB باشد' }, { status: 400 })
    }

    // Never trust the client's extension — fall back to jpg rather than storing
    // whatever suffix was uploaded.
    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : 'jpg'
    const filename = `receipt-${id}-${Date.now()}.${ext}`

    await putBlob(filename, await file.arrayBuffer(), { contentType: file.type })
    storedName = filename

    const order = await uploadReceipt(id, {
      filename,
      amount: receiptAmount,
      trackingCode: trackingCode || '',
    })

    if (!order) {
      await deleteBlob(storedName)
      return NextResponse.json({ error: 'سفارش یافت نشد' }, { status: 404 })
    }

    if (order.error === 'receipt_only_allowed_for_pending_orders') {
      await deleteBlob(storedName)
      return NextResponse.json(
        {
          error: 'رسید فقط برای سفارشات در انتظار پرداخت قابل آپلود است',
          code: 'receipt_only_allowed_for_pending_orders',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'رسید با موفقیت آپلود شد',
      filename,
    })
  } catch (error) {
    console.error('Receipt upload error:', error)
    if (storedName) {
      try {
        await deleteBlob(storedName)
      } catch (cleanupError) {
        console.error('Failed to clean up receipt blob:', cleanupError)
      }
    }
    return NextResponse.json({ error: 'خطا در آپلود رسید' }, { status: 500 })
  }
}
