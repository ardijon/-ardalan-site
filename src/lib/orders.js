import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

const ORDERS_FILE = path.join(process.cwd(), 'src/data/orders.json')

// Async-safe in-memory lock with queue
let writeLock = false
const lockQueue = []

function acquireLock() {
  if (!writeLock) {
    writeLock = true
    return Promise.resolve()
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

async function readOrders() {
  try {
    if (!existsSync(ORDERS_FILE)) {
      await writeFile(ORDERS_FILE, '[]', 'utf8')
      return []
    }
    const data = await readFile(ORDERS_FILE, 'utf8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function writeOrders(orders) {
  await writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8')
}

async function readAndWrite(fn) {
  await acquireLock()
  try {
    const orders = await readOrders()
    const result = fn(orders)
    await writeOrders(orders)
    return result
  } catch (error) {
    console.error('Error in readAndWrite:', error)
    throw error
  } finally {
    releaseLock()
  }
}

function generateOrderId() {
  const timestamp = Date.now()
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `ORD-${timestamp}-${random}`
}

function sanitize(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>]/g, '').trim()
}

export async function getAllOrders() {
  return readOrders()
}

export async function getOrderById(orderId) {
  const orders = await readOrders()
  return orders.find(o => o.id === orderId) || null
}

export async function getOrdersByPhone(phone) {
  const orders = await readOrders()
  return orders.filter(o => o.customer?.phone === phone)
}

export async function getOrdersByStatus(status) {
  const orders = await readOrders()
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
        name: sanitize(customer.name),
        phone: customer.phone,
        email: sanitize(customer.email || ''),
        domain: sanitize(customer.domain || ''),
        hostingInfo: sanitize(customer.hostingInfo || ''),
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

export async function getOrderStats() {
  const orders = await readOrders()
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
