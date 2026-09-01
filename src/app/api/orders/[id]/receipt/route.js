import { NextResponse } from 'next/server'
import { uploadReceipt, getOrderById } from '@/lib/orders'
import { putBlob, deleteBlob } from '@/lib/blob'
import { createRateLimiter } from '@/lib/rate-limit'
import { checkCsrf } from '@/lib/admin-auth'
import { extractClientKey } from '@/lib/request-ip'

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
const MAX_TRACKING_CODE = 100

const receiptRateLimiter = createRateLimiter({
  namespace: 'receipt',
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
})

// Validate order ID format (alphanumeric + hyphens only)
function isValidOrderId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9-]+$/.test(id) && id.length <= 50
}

/** Magic-byte signatures for the accepted image formats. */
function sniffImageType(bytes) {
  if (!bytes || bytes.length < 12) return null
  const b = new Uint8Array(bytes)
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'image/webp'
  return null
}

/**
 * Validate receipt amount against the order's uniqueAmount.
 *
 * A small fixed tolerance, not a percentage: the customer is told to transfer
 * the exact amount, and the amount exists precisely to single this order out.
 * A ±10% window on a Pro order (≈±1.5M) is wider than the entire 999k suffix
 * space, i.e. every Pro order's amount would validate against every other's —
 * the check would never catch a wrong-order receipt. ±5,000 covers bank
 * rounding without swallowing a neighbouring order's suffix.
 */
const RECEIPT_TOLERANCE_TOMAN = 5000

function validateReceiptAmount(receiptAmount, expectedAmount) {
  if (!receiptAmount || receiptAmount <= 0) {
    return { valid: false, error: 'مبلغ رسید باید بزرگتر از صفر باشد' }
  }
  if (!expectedAmount || expectedAmount <= 0) {
    return { valid: false, error: 'مبلغ انتظاری سفارش نامعتبر است' }
  }

  const diff = Math.abs(receiptAmount - expectedAmount)
  if (diff > RECEIPT_TOLERANCE_TOMAN) {
    return {
      valid: false,
      error: `مبلغ رسید (${receiptAmount.toLocaleString('fa-IR')} تومان) با مبلغ سفارش (${expectedAmount.toLocaleString('fa-IR')} تومان) مطابقت ندارد. تفاوت مجاز: ±${RECEIPT_TOLERANCE_TOMAN.toLocaleString('fa-IR')} تومان`
    }
  }
  return { valid: true }
}

export async function POST(request, { params }) {
  // Tracked so any failure after the write removes the orphaned blob.
  let storedName = null

  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ip = extractClientKey(request)
  const rateLimitResult = await receiptRateLimiter.check(ip)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید' },
      { status: 429, headers: { 'Retry-After': String(receiptRateLimiter.retryAfter) } }
    )
  }

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
    const phone = String(formData.get('phone') || '').trim()

    if (!file) {
      return NextResponse.json({ error: 'فایل رسید را انتخاب کنید' }, { status: 400 })
    }

    // Second factor: the order ID alone is enumerable (timestamp + a few random
    // bytes), so the buyer's phone must match too — the same two-factor rule
    // the tracking endpoint applies. Without this, anyone who guesses an
    // awaiting_payment order ID could attach a fake slip to someone else's
    // purchase and lock the real buyer out of uploading.
    if (phone !== existingOrder.customer?.phone) {
      return NextResponse.json(
        { error: 'شماره تلفن با سفارش مطابقت ندارد' },
        { status: 403 }
      )
    }

    if (typeof trackingCode === 'string' && trackingCode.length > MAX_TRACKING_CODE) {
      return NextResponse.json({ error: 'کد رهگیری بیش از حد طولانی است' }, { status: 400 })
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

    const bytes = await file.arrayBuffer()

    // The multipart Content-Type is client-controlled, so the declared type is
    // cross-checked against the file's magic bytes before anything is stored.
    const sniffed = sniffImageType(bytes)
    if (!sniffed || sniffed !== file.type) {
      return NextResponse.json(
        { error: 'محتوای فایل با فرمت اعلام‌شده مطابقت ندارد' },
        { status: 400 }
      )
    }

    // Never trust the client's extension — fall back to jpg rather than storing
    // whatever suffix was uploaded.
    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : 'jpg'
    const filename = `receipt-${id}-${Date.now()}.${ext}`

    await putBlob(filename, bytes, { contentType: file.type })
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
