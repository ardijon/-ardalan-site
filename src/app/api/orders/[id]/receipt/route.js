import { NextResponse } from 'next/server'
import { uploadReceipt, getOrderById } from '@/lib/orders'
import { unlinkSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/receipts')

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

// Validate order ID format (alphanumeric + hyphens only)
function isValidOrderId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9-]+$/.test(id) && id.length <= 50
}

function sanitizeFilepath(filepath) {
  const resolved = path.resolve(filepath)
  const uploadDirResolved = path.resolve(UPLOAD_DIR)
  if (!resolved.startsWith(uploadDirResolved)) {
    throw new Error('Invalid filepath')
  }
  return resolved
}

export async function POST(request, { params }) {
  let filepath = null
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
    const existingOrder = await getOrderById(id)
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'سفارش یافت نشد' },
        { status: 404 }
      )
    }

    // Check order status before processing
    if (existingOrder.status !== 'awaiting_payment') {
      return NextResponse.json(
        { error: 'رسید فقط برای سفارشات در انتظار پرداخت قابل آپلود است' },
        { status: 400 }
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
    filepath = path.join(UPLOAD_DIR, filename)

    // Validate filepath to prevent path traversal
    filepath = sanitizeFilepath(filepath)

    const bytes = await file.arrayBuffer()
    const fs = await import('fs/promises')
    await fs.writeFile(filepath, Buffer.from(bytes))

    const order = await uploadReceipt(id, {
      filename,
      amount: amount ? parseInt(amount) : 0,
      trackingCode: trackingCode || '',
    })

    if (!order) {
      // Cleanup: delete the uploaded file if order not found
      if (filepath && existsSync(filepath)) {
        unlinkSync(filepath)
      }
      return NextResponse.json(
        { error: 'سفارش یافت نشد' },
        { status: 404 }
      )
    }

    if (order.error === 'receipt_only_allowed_for_pending_orders') {
      // Cleanup: delete the uploaded file if status is wrong
      if (filepath && existsSync(filepath)) {
        unlinkSync(filepath)
      }
      return NextResponse.json(
        { error: 'رسید فقط برای سفارشات در انتظار پرداخت قابل آپلود است', code: 'receipt_only_allowed_for_pending_orders' },
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
    // Cleanup: delete the uploaded file on any error
    if (filepath && existsSync(filepath)) {
      try {
        unlinkSync(filepath)
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError)
      }
    }
    return NextResponse.json(
      { error: 'خطا در آپلود رسید' },
      { status: 500 }
    )
  }
}
