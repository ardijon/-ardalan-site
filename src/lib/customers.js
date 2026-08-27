import { getAllOrders, REVENUE_STATUSES } from '@/lib/orders'

/**
 * A customer is a view over orders, not a stored record.
 *
 * WHY THERE IS NO `customers` COLLECTION
 * --------------------------------------
 * Every fact about a customer already lives on their orders — the name they typed,
 * the phone they were reached on, what they bought, what they paid. A second
 * collection would be a copy of that, and copies drift: a name corrected on a new
 * order would disagree with the customer record, and there would be no way to tell
 * which one was true. Deriving it means the answer cannot be stale.
 *
 * The cost is that this reads every order to answer any question about customers.
 * At the current scale that is one KV read; if the collection ever outgrows that,
 * the fix is a cached projection, not a hand-maintained duplicate.
 *
 * WHY PHONE IS THE IDENTITY
 * -------------------------
 * It is the only field the checkout requires and validates (`/^09\d{9}$/`), it is
 * what the bank transfer is reconciled against, and it is how the buyer is actually
 * contacted. Email is optional, and names are typed differently every time —
 * "علی رضایی" and "علی  رضایی" are one person and two strings.
 */

/** Orders that represent money actually taken. */
function isEarning(order) {
  return REVENUE_STATUSES.includes(order.status)
}

function amountOf(order) {
  const amount = Number(order?.uniqueAmount)
  return Number.isFinite(amount) ? amount : 0
}

/**
 * Latest non-empty value of a field across a customer's orders.
 *
 * Later orders win because the newest one is the most recent thing the customer
 * told us — a corrected spelling or a changed domain. Empty is skipped rather than
 * overwriting, so leaving the optional email blank on a second order does not erase
 * the address given on the first.
 */
function latest(orders, pick) {
  for (let i = orders.length - 1; i >= 0; i -= 1) {
    const value = pick(orders[i])
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/**
 * Groups every order by customer phone.
 *
 * @returns {Promise<Array>} one row per customer, most recent order first.
 */
export async function getCustomers() {
  const orders = await getAllOrders()

  // Oldest first inside each group, so `latest()` can walk backwards and
  // firstOrderAt/lastOrderAt fall out of the ends without another sort.
  const chronological = [...orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  const groups = new Map()
  for (const order of chronological) {
    const phone = order.customer?.phone
    // An order with no phone cannot be attributed to anyone and cannot be
    // contacted, so it is left out rather than collected under a fake key that
    // would read as one very busy customer.
    if (!phone) continue
    const list = groups.get(phone) || []
    list.push(order)
    groups.set(phone, list)
  }

  const customers = []
  for (const [phone, list] of groups) {
    const earning = list.filter(isEarning)

    customers.push({
      phone,
      name: latest(list, o => o.customer?.name) || 'بدون نام',
      email: latest(list, o => o.customer?.email),
      domain: latest(list, o => o.customer?.domain),

      orderCount: list.length,
      paidCount: earning.length,
      // Only earning orders, so an abandoned checkout does not read as a customer
      // who spent money.
      revenue: earning.reduce((sum, o) => sum + amountOf(o), 0),

      // Distinct products, in the order they were first bought — it reads as the
      // path this customer took through the catalogue.
      products: [...new Set(list.map(o => o.productId).filter(Boolean))],
      plans: [...new Set(list.map(o => o.plan).filter(Boolean))],

      // What is waiting on me for this customer, which is the reason to open the
      // row at all.
      needsReview: list.filter(o => o.status === 'receipt_uploaded').length,

      firstOrderAt: list[0].createdAt,
      lastOrderAt: list[list.length - 1].createdAt,

      // The orders themselves, newest first, so the panel can show the history
      // without a second request.
      orders: [...list].reverse(),
    })
  }

  // Most recently active first: the customer who ordered today is the one likely
  // to be in the middle of a conversation.
  customers.sort((a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt))
  return customers
}

/**
 * Totals across customers.
 *
 * `repeat` is the number worth watching: a second purchase from the same phone is
 * the only evidence in this data that the first one was worth the money.
 */
export async function getCustomerStats() {
  const customers = await getCustomers()

  const paying = customers.filter(c => c.paidCount > 0)
  const repeat = customers.filter(c => c.paidCount > 1)
  const revenue = paying.reduce((sum, c) => sum + c.revenue, 0)

  return {
    total: customers.length,
    paying: paying.length,
    repeat: repeat.length,
    needsReview: customers.filter(c => c.needsReview > 0).length,
    // Average over paying customers only. Averaging over everyone would mix in
    // abandoned checkouts and quietly halve the figure.
    averageRevenue: paying.length > 0 ? Math.round(revenue / paying.length) : 0,
    revenue,
  }
}
