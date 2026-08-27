import { getOrderStats, REVENUE_STATUSES } from '@/lib/orders'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'

/**
 * Revenue is the one number in the panel that can be wrong without looking wrong.
 *
 * A miscounted status badge is obvious the moment you open the orders list; a
 * revenue figure that quietly includes rejected orders is believed. So the
 * fixtures are written straight to the collection file with fixed amounts rather
 * than built through createOrder — createOrder randomises uniqueAmount and cannot
 * set a status or a createdAt, which is exactly what these assertions are about.
 */

// DATA_DIR is set to a scratch directory by jest.setup.js — never src/data.
const ORDERS_FILE = path.join(process.cwd(), process.env.DATA_DIR, 'orders.json')

function order(overrides) {
  return {
    id: `ORD-${Math.random().toString(16).slice(2)}`,
    productId: 'tavana',
    plan: 'pro',
    customer: { name: 'تست', phone: '09123456789' },
    status: 'awaiting_payment',
    uniqueAmount: 1_000_000,
    createdAt: '2026-05-10T09:00:00.000Z',
    statusHistory: [],
    ...overrides,
  }
}

function seed(orders) {
  mkdirSync(path.dirname(ORDERS_FILE), { recursive: true })
  writeFileSync(ORDERS_FILE, JSON.stringify(orders), 'utf8')
}

beforeEach(() => seed([]))

describe('getOrderStats — the counts the orders tab already reads', () => {
  it('keeps every status key OrderManagement depends on', async () => {
    const stats = await getOrderStats()

    // OrderManagement.js reads these by name on its filter tabs. Renaming one
    // shows a blank badge rather than an error, so it is asserted here instead.
    for (const key of ['total', 'pending', 'receiptUploaded', 'approved', 'deploying', 'completed', 'rejected']) {
      expect(stats[key]).toBe(0)
    }
  })

  it('counts each status separately', async () => {
    seed([
      order({ status: 'awaiting_payment' }),
      order({ status: 'awaiting_payment' }),
      order({ status: 'receipt_uploaded' }),
      order({ status: 'approved' }),
      order({ status: 'deploying' }),
      order({ status: 'completed' }),
      order({ status: 'rejected' }),
    ])

    const stats = await getOrderStats()
    expect(stats.total).toBe(7)
    expect(stats.pending).toBe(2)
    expect(stats.receiptUploaded).toBe(1)
    expect(stats.approved).toBe(1)
    expect(stats.deploying).toBe(1)
    expect(stats.completed).toBe(1)
    expect(stats.rejected).toBe(1)
  })
})

describe('getOrderStats — revenue', () => {
  it('sums only the statuses where the money arrived', async () => {
    seed([
      order({ status: 'approved', uniqueAmount: 14_900_523 }),
      order({ status: 'deploying', uniqueAmount: 490_777 }),
      order({ status: 'completed', uniqueAmount: 3_000_101 }),
      // None of these are money.
      order({ status: 'awaiting_payment', uniqueAmount: 99_000_000 }),
      order({ status: 'receipt_uploaded', uniqueAmount: 99_000_000 }),
      order({ status: 'rejected', uniqueAmount: 99_000_000 }),
    ])

    const stats = await getOrderStats()
    expect(stats.revenue).toBe(14_900_523 + 490_777 + 3_000_101)
    expect(stats.paidOrders).toBe(3)
  })

  it('counts a deploying order as paid', async () => {
    // It got there by being approved first. If it dropped out of the total,
    // revenue would fall every time an order moved forward.
    expect(REVENUE_STATUSES).toContain('deploying')

    seed([order({ status: 'approved', uniqueAmount: 500_000 })])
    const before = await getOrderStats()

    seed([order({ status: 'deploying', uniqueAmount: 500_000 })])
    const after = await getOrderStats()

    expect(after.revenue).toBe(before.revenue)
  })

  it('reports the unverified receipts separately', async () => {
    seed([
      order({ status: 'receipt_uploaded', uniqueAmount: 2_000_500 }),
      order({ status: 'receipt_uploaded', uniqueAmount: 490_300 }),
      order({ status: 'completed', uniqueAmount: 1_000_000 }),
    ])

    const stats = await getOrderStats()
    expect(stats.pendingRevenue).toBe(2_000_500 + 490_300)
    expect(stats.revenue).toBe(1_000_000)
  })

  it('sums uniqueAmount, not the receipt the buyer typed', async () => {
    // uniqueAmount is what the bank statement will show. A buyer who typed the
    // wrong figure into the receipt form must not move the totals.
    seed([
      order({
        status: 'completed',
        uniqueAmount: 14_900_523,
        receipt: { amount: 1, trackingCode: 'x', filename: 'r.jpg', uploadedAt: '2026-05-11T00:00:00.000Z' },
      }),
    ])

    expect((await getOrderStats()).revenue).toBe(14_900_523)
  })

  it('treats a missing or unparseable amount as zero instead of NaN', async () => {
    // One NaN poisons the whole sum, and NaN renders as "NaN تومان" in the panel.
    seed([
      order({ status: 'completed', uniqueAmount: undefined }),
      order({ status: 'completed', uniqueAmount: 'صد تومان' }),
      order({ status: 'completed', uniqueAmount: 500_000 }),
    ])

    const stats = await getOrderStats()
    expect(stats.revenue).toBe(500_000)
    expect(stats.paidOrders).toBe(3)
  })

  it('averages over paid orders only, and does not divide by zero', async () => {
    expect((await getOrderStats()).averageOrderValue).toBe(0)

    seed([
      order({ status: 'completed', uniqueAmount: 1_000_000 }),
      order({ status: 'approved', uniqueAmount: 2_000_000 }),
      order({ status: 'awaiting_payment', uniqueAmount: 90_000_000 }),
    ])

    expect((await getOrderStats()).averageOrderValue).toBe(1_500_000)
  })

  it('reports conversion as paid over all orders', async () => {
    expect((await getOrderStats()).conversionRate).toBe(0)

    seed([
      order({ status: 'completed' }),
      order({ status: 'rejected' }),
      order({ status: 'awaiting_payment' }),
      order({ status: 'awaiting_payment' }),
    ])

    expect((await getOrderStats()).conversionRate).toBe(25)
  })
})

describe('getOrderStats — byMonth', () => {
  it('groups paid orders by month, oldest first', async () => {
    seed([
      order({ status: 'completed', createdAt: '2026-07-02T10:00:00.000Z', uniqueAmount: 300_000 }),
      order({ status: 'approved', createdAt: '2026-05-20T10:00:00.000Z', uniqueAmount: 100_000 }),
      order({ status: 'completed', createdAt: '2026-05-28T10:00:00.000Z', uniqueAmount: 200_000 }),
    ])

    const { byMonth } = await getOrderStats()
    // An array rather than an object: a chart needs a defined order, and object
    // key order is not something to rely on.
    expect(byMonth.map(m => m.month)).toEqual(['2026-05', '2026-07'])
    expect(byMonth[0]).toEqual({ month: '2026-05', count: 2, revenue: 300_000 })
    expect(byMonth[1]).toEqual({ month: '2026-07', count: 1, revenue: 300_000 })
  })

  it('leaves unpaid orders out of the monthly trend', async () => {
    seed([
      order({ status: 'awaiting_payment', createdAt: '2026-06-01T10:00:00.000Z' }),
      order({ status: 'rejected', createdAt: '2026-06-02T10:00:00.000Z' }),
    ])

    expect((await getOrderStats()).byMonth).toEqual([])
  })

  it('skips an order whose date cannot be parsed rather than making a NaN bucket', async () => {
    seed([
      order({ status: 'completed', createdAt: 'دیروز', uniqueAmount: 400_000 }),
      order({ status: 'completed', createdAt: '2026-05-01T10:00:00.000Z', uniqueAmount: 100_000 }),
    ])

    const stats = await getOrderStats()
    expect(stats.byMonth).toEqual([{ month: '2026-05', count: 1, revenue: 100_000 }])
    // Still counted as revenue — the money is real even if the timestamp is junk.
    expect(stats.revenue).toBe(500_000)
  })
})

describe('getOrderStats — byProduct and byPlan', () => {
  it('separates interest from revenue', async () => {
    seed([
      order({ productId: 'tavana', status: 'completed', uniqueAmount: 14_900_000 }),
      order({ productId: 'tavana', status: 'rejected', uniqueAmount: 14_900_000 }),
      order({ productId: 'agent-site', status: 'awaiting_payment', uniqueAmount: 3_000_000 }),
    ])

    const { byProduct } = await getOrderStats()
    // An abandoned checkout is demand, not income — it has to show up in one
    // column and not the other.
    expect(byProduct.tavana).toEqual({ orders: 2, paid: 1, revenue: 14_900_000 })
    expect(byProduct['agent-site']).toEqual({ orders: 1, paid: 0, revenue: 0 })
  })

  it('splits revenue by plan', async () => {
    seed([
      order({ plan: 'pro', status: 'completed', uniqueAmount: 14_900_000 }),
      order({ plan: 'starter', status: 'approved', uniqueAmount: 490_000 }),
      order({ plan: 'starter', status: 'completed', uniqueAmount: 490_000 }),
    ])

    const { byPlan } = await getOrderStats()
    expect(byPlan.pro).toEqual({ orders: 1, paid: 1, revenue: 14_900_000 })
    expect(byPlan.starter).toEqual({ orders: 2, paid: 2, revenue: 980_000 })
  })

  it('buckets a missing product or plan under unknown instead of dropping it', async () => {
    // Revenue has to reconcile with the sum of the breakdown, or the panel looks
    // like it is losing money somewhere.
    seed([order({ productId: undefined, plan: null, status: 'completed', uniqueAmount: 750_000 })])

    const stats = await getOrderStats()
    expect(stats.byProduct.unknown.revenue).toBe(750_000)
    expect(stats.byPlan.unknown.revenue).toBe(750_000)
    expect(stats.revenue).toBe(750_000)
  })
})
