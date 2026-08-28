import crypto from 'crypto'
import { readCollection, mutateCollection } from '@/lib/storage'
import { recordAudit, auditSummary, AUDIT_ACTORS } from '@/lib/audit'

/**
 * Order persistence.
 *
 * Storage goes through src/lib/storage.js rather than fs directly: on Cloudflare
 * Workers the filesystem is not writable and is not shared between isolates, so
 * writing src/data/orders.json meant every submitted order was lost. The storage
 * layer uses Cloudflare KV in production and the same JSON file locally.
 *
 * The read-modify-write lock that used to live here moved into the storage layer
 * (mutateCollection), so it now protects every collection rather than just this
 * one.
 */

const COLLECTION = 'orders'

async function readOrders() {
  return readCollection(COLLECTION, [])
}

async function readAndWrite(fn) {
  try {
    return await mutateCollection(COLLECTION, fn, [])
  } catch (error) {
    console.error('Error in readAndWrite:', error)
    throw error
  }
}

function generateOrderId() {
  const timestamp = Date.now()
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `ORD-${timestamp}-${random}`
}

/**
 * Generates a unique amount by adding a random suffix to the base price.
 * Uses a larger range (1000-999999) to minimize collisions, and retries on collision.
 * The suffix is chosen so the total amount uniquely identifies the order for bank transfer matching.
 */
async function generateUniqueAmount(basePrice) {
  const maxRetries = 10
  const existingAmounts = new Set()

  // Pre-fetch existing unique amounts to avoid collisions
  try {
    const orders = await readOrders()
    for (const order of orders) {
      if (order.uniqueAmount) existingAmounts.add(order.uniqueAmount)
    }
  } catch {
    // If we can't read orders, proceed without collision check
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Use crypto.randomInt for better randomness, range 1000-999999 (6 digits)
    const randomSuffix = crypto.randomInt(1000, 1000000)
    const uniqueAmount = basePrice + randomSuffix

    if (!existingAmounts.has(uniqueAmount)) {
      return uniqueAmount
    }
  }

  // Fallback: use timestamp-based suffix if all retries collide (extremely unlikely)
  const fallbackSuffix = Date.now() % 1000000
  return basePrice + fallbackSuffix
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

export async function createOrder({ productId, plan, customer, receipt, basePrice }) {
  // Generate unique amount before the write transaction to avoid async in callback
  const uniqueAmount = await generateUniqueAmount(basePrice || 0)

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
      uniqueAmount,
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

/**
 * Audit lives here rather than in the routes that call these functions.
 *
 * Not for tidiness — for the actor. `updateOrderStatus` is reachable only from the
 * admin panel and `uploadReceipt` only from the customer's tracking page, so which
 * function was called *is* who did it. Recording in the route would mean a fourth
 * caller some day gets the actor wrong, or forgets entirely; recording here means a
 * status change cannot happen without leaving a trace.
 *
 * Always after the write, never inside `mutateCollection`'s callback: that callback
 * is invoked synchronously and its return value is not awaited, so an async append
 * in there would race the write it was supposed to describe.
 */
export async function updateOrderStatus(orderId, status, note = '') {
  const order = await readAndWrite(orders => {
    const index = orders.findIndex(o => o.id === orderId)
    if (index === -1) return null

    const now = new Date().toISOString()
    orders[index].status = status
    orders[index].updatedAt = now
    orders[index].statusHistory.push({ status, at: now, note })

    return orders[index]
  })

  if (order) {
    await recordAudit({
      action: 'order.status',
      entityId: order.id,
      summary: auditSummary.orderStatus(order, status, note),
    })
  }

  return order
}

// Only allow receipt upload when order is in awaiting_payment status
export async function uploadReceipt(orderId, receiptData) {
  const result = await readAndWrite(orders => {
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

  // `{ error }` is a rejected upload, not an upload — logging it would put a row in
  // the panel claiming a receipt arrived when the order refused it.
  if (result && !result.error) {
    await recordAudit({
      action: 'order.receipt',
      actor: AUDIT_ACTORS.CUSTOMER,
      entityId: result.id,
      summary: auditSummary.receipt(result),
    })
  }

  return result
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

/**
 * Statuses in which the money is actually in the account.
 *
 * `deploying` belongs here even though it sits after `approved`: an order only
 * reaches it by having been approved first, so leaving it out would make revenue
 * visibly drop the moment an order moved forward. `receipt_uploaded` does not
 * belong — the receipt is a claim until it has been checked against the amount.
 */
export const REVENUE_STATUSES = ['approved', 'deploying', 'completed']

/** Claimed but unverified: the queue that is worth money once it is reviewed. */
export const PENDING_REVENUE_STATUSES = ['receipt_uploaded']

/**
 * `uniqueAmount` is the amount, full stop.
 *
 * It is the base price plus a random 100–999 so a bank transfer can be matched to
 * an order, which means it is what the customer actually transferred. `basePrice`
 * is never persisted, so there is nothing else to sum — and summing the receipt's
 * self-reported amount would let a typo in the buyer's form change the totals.
 */
function amountOf(order) {
  const amount = Number(order?.uniqueAmount)
  return Number.isFinite(amount) ? amount : 0
}

/** `YYYY-MM` in local time, or null for an order with an unparseable date. */
function monthOf(order) {
  const date = new Date(order?.createdAt)
  if (!Number.isFinite(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function getOrderStats() {
  const orders = await readOrders()

  const countBy = status => orders.filter(o => o.status === status).length
  const earning = orders.filter(o => REVENUE_STATUSES.includes(o.status))
  const revenue = earning.reduce((sum, o) => sum + amountOf(o), 0)

  // Grouped in one pass, keyed by month, then flattened to a sorted array: a
  // chart needs the order to be defined, and object key order is not a contract.
  const months = new Map()
  for (const order of earning) {
    const month = monthOf(order)
    if (!month) continue
    const row = months.get(month) || { month, count: 0, revenue: 0 }
    row.count += 1
    row.revenue += amountOf(order)
    months.set(month, row)
  }

  // Every order counts toward its product's `orders`, but only an earning one
  // toward its `revenue` — otherwise an abandoned checkout would read as demand
  // that paid.
  const byProduct = {}
  for (const order of orders) {
    const key = order.productId || 'unknown'
    const row = byProduct[key] || (byProduct[key] = { orders: 0, paid: 0, revenue: 0 })
    row.orders += 1
    if (REVENUE_STATUSES.includes(order.status)) {
      row.paid += 1
      row.revenue += amountOf(order)
    }
  }

  const byPlan = {}
  for (const order of orders) {
    const key = order.plan || 'unknown'
    const row = byPlan[key] || (byPlan[key] = { orders: 0, paid: 0, revenue: 0 })
    row.orders += 1
    if (REVENUE_STATUSES.includes(order.status)) {
      row.paid += 1
      row.revenue += amountOf(order)
    }
  }

  return {
    // The status counts the orders tab already reads — unchanged.
    total: orders.length,
    pending: countBy('awaiting_payment'),
    receiptUploaded: countBy('receipt_uploaded'),
    approved: countBy('approved'),
    deploying: countBy('deploying'),
    completed: countBy('completed'),
    rejected: countBy('rejected'),

    revenue,
    // What is sitting in the review queue. Shown next to `revenue` so an unopened
    // panel is visibly costing something.
    pendingRevenue: orders
      .filter(o => PENDING_REVENUE_STATUSES.includes(o.status))
      .reduce((sum, o) => sum + amountOf(o), 0),
    paidOrders: earning.length,
    averageOrderValue: earning.length ? Math.round(revenue / earning.length) : 0,
    // Of the orders that got as far as a receipt, how many were approved. A low
    // number here means receipts are being rejected, not that traffic is bad.
    conversionRate: orders.length ? Math.round((earning.length / orders.length) * 100) : 0,

    // Keyed on createdAt rather than the approval timestamp: the manual transfer
    // flow closes in days, so the two only diverge at a month boundary, and
    // `createdAt` cannot be ambiguous the way a rejected-then-approved order's
    // history can.
    byMonth: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    byProduct,
    byPlan,
  }
}
