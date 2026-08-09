import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const ORDERS_FILE = path.join(process.cwd(), 'src/data/orders.json')

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

export function createOrder({ productId, plan, customer, receipt }) {
  const orders = readOrders()
  const now = new Date().toISOString()

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
    createdAt: now,
    updatedAt: now,
  }

  orders.push(order)
  writeOrders(orders)
  return order
}

export function updateOrderStatus(orderId, status, note = '') {
  const orders = readOrders()
  const index = orders.findIndex(o => o.id === orderId)
  if (index === -1) return null

  const now = new Date().toISOString()
  orders[index].status = status
  orders[index].updatedAt = now
  orders[index].statusHistory.push({ status, at: now, note })

  writeOrders(orders)
  return orders[index]
}

export function uploadReceipt(orderId, receiptData) {
  const orders = readOrders()
  const index = orders.findIndex(o => o.id === orderId)
  if (index === -1) return null

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

  writeOrders(orders)
  return orders[index]
}

export function updateDeployment(orderId, deploymentData) {
  const orders = readOrders()
  const index = orders.findIndex(o => o.id === orderId)
  if (index === -1) return null

  const now = new Date().toISOString()
  orders[index].deployment = {
    ...orders[index].deployment,
    ...deploymentData,
  }
  orders[index].updatedAt = now

  writeOrders(orders)
  return orders[index]
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
