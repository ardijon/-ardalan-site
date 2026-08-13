import { NextResponse } from 'next/server'
import { uploadReceipt, getOrderById } from '@/lib/orders'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/receipts')

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

// Validate order ID format (alphanumeric + hyphens only)
function isValidOrderId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9-]+$/.test(id) && id.length <= 50
}

export async function POST(request, { params }) {
  try {
    const { id } = await params

    // Validate order ID format to prevent path traversal
    if (!isValidOrderId(id)) {
      return NextResponse.json(
        { error: 'شناسه سفارش نامعتبر است' },
        { status: 400 }
      )
    }

    // Verify the order exists before allowing upload
    const existingOrder = getOrderById(id)
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'سفارش یافت نشد' },
        { status: 404 }
      )
    }
    const formData = await request.formData()
    const file = formData.get('receipt')
    const amount = formData.get('amount')
    const trackingCode = formData.get('trackingCode')

    if (!file) {
      return NextResponse.json(
        { error: 'فایل رسید را انتخاب کنید' },
        { status: 400 }
      )
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'فرمت فایل معتبر نیست (فقط JPG, PNG, WebP)' },
        { status: 400 }
      )
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'حجم فایل حداکثر 5MB باشد' },
        { status: 400 }
      )
    }

    ensureUploadDir()

    // Sanitize file extension - only allow safe extensions
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp']
    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const ext = allowedExtensions.includes(rawExt) ? rawExt : 'jpg'
    const filename = `receipt-${id}-${Date.now()}.${ext}`
    const filepath = path.join(UPLOAD_DIR, filename)

    const bytes = await file.arrayBuffer()
    fs.writeFileSync(filepath, Buffer.from(bytes))

    const order = await uploadReceipt(id, {
      filename,
      amount: amount ? parseInt(amount) : 0,
      trackingCode: trackingCode || '',
    })

    if (!order) {
      return NextResponse.json(
        { error: 'سفارش یافت نشد' },
        { status: 404 }
      )
    }

    if (order.error === 'receipt_only_allowed_for_pending_orders') {
      return NextResponse.json(
        { error: 'رسید فقط برای سفارشات در انتظار پرداخت قابل آپلود است' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'رسید با موفقیت آپلود شد',
      filename,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'خطا در آپلود رسید' },
      { status: 500 }
    )
  }
}
