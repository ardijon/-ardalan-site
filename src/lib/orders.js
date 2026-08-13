import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const ORDERS_FILE = path.join(process.cwd(), 'src/data/orders.json')

// File lock to prevent race conditions on concurrent writes
let writeLock = false
const lockQueue = []

async function acquireLock() {
  if (!writeLock) {
    writeLock = true
    return
  }
  return new Promise(resolve => lockQueue.push(resolve))
}

function releaseLock() {
  if (lockQueue.length > 0) {
    const next = lockQueue.shift()
    next()
  } else {
    writeLock = false
  }
}

function readOrders() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) {
      fs.writeFileSync(ORDERS_FILE, '[]', 'utf8')
      return []
    }
    const data = fs.readFileSync(ORDERS_FILE, 'utf8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8')
}

async function readAndWrite(fn) {
  await acquireLock()
  try {
    const orders = readOrders()
    const result = fn(orders)
    writeOrders(orders)
    return result
  } finally {
    releaseLock()
  }
}

function generateOrderId() {
  const timestamp = Date.now()
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `ORD-${timestamp}-${random}`
}

export function getAllOrders() {
  return readOrders()
}

export function getOrderById(orderId) {
  const orders = readOrders()
  return orders.find(o => o.id === orderId) || null
}

export function getOrdersByPhone(phone) {
  const orders = readOrders()
  return orders.filter(o => o.customer?.phone === phone)
}

export function getOrdersByStatus(status) {
  const orders = readOrders()
  if (status === 'all') return orders
  return orders.filter(o => o.status === status)
}

export async function createOrder({ productId, plan, customer, receipt }) {
  return readAndWrite(orders => {
    const now = new Date().toISOString()

    // Calculate expiry date for Starter plan (30 days from deployment)
    const expiresAt = plan === 'starter'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null

    const order = {
      id: generateOrderId(),
      productId,
      plan,
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        domain: customer.domain || '',
        hostingInfo: customer.hostingInfo || '',
      },
      receipt: receipt || null,
      status: 'awaiting_payment',
      statusHistory: [
        { status: 'awaiting_payment', at: now, note: 'سفارش ثبت شد' }
      ],
      deployment: {
        status: 'pending',
        startedAt: null,
        completedAt: null,
        host: customer.domain || '',
        error: null,
      },
      subscription: plan === 'starter' ? {
        expiresAt,
        renewedAt: null,
        active: false,
      } : null,
      createdAt: now,
      updatedAt: now,
    }

    orders.push(order)
    return order
  })
}

export async function updateOrderStatus(orderId, status, note = '') {
  return readAndWrite(orders => {
    const index = orders.findIndex(o => o.id === orderId)
    if (index === -1) return null

    const now = new Date().toISOString()
    orders[index].status = status
    orders[index].updatedAt = now
    orders[index].statusHistory.push({ status, at: now, note })

    return orders[index]
  })
}

// Only allow receipt upload when order is in awaiting_payment status
export async function uploadReceipt(orderId, receiptData) {
  return readAndWrite(orders => {
    const index = orders.findIndex(o => o.id === orderId)
    if (index === -1) return null

    // Prevent status regression: only allow receipt upload for awaiting_payment orders
    if (orders[index].status !== 'awaiting_payment') {
      return { error: 'receipt_only_allowed_for_pending_orders' }
    }

    const now = new Date().toISOString()
    orders[index].receipt = {
      filename: receiptData.filename,
      uploadedAt: now,
      amount: receiptData.amount || 0,
      trackingCode: receiptData.trackingCode || '',
    }
    orders[index].status = 'receipt_uploaded'
    orders[index].statusHistory.push({
      status: 'receipt_uploaded',
      at: now,
      note: 'رسید پرداخت دریافت شد'
    })
    orders[index].updatedAt = now

    return orders[index]
  })
}

export async function updateDeployment(orderId, deploymentData) {
  return readAndWrite(orders => {
    const index = orders.findIndex(o => o.id === orderId)
    if (index === -1) return null

    const now = new Date().toISOString()
    orders[index].deployment = {
      ...orders[index].deployment,
      ...deploymentData,
    }
    orders[index].updatedAt = now

    return orders[index]
  })
}

export function getOrderStats() {
  const orders = readOrders()
  return {
    total: orders.length,
    pending: orders.filter(o => o.status === 'awaiting_payment').length,
    receiptUploaded: orders.filter(o => o.status === 'receipt_uploaded').length,
    approved: orders.filter(o => o.status === 'approved').length,
    deploying: orders.filter(o => o.status === 'deploying').length,
    completed: orders.filter(o => o.status === 'completed').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
  }
}
