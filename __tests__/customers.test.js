import { getCustomers, getCustomerStats } from '@/lib/customers'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'

/**
 * A customer is derived, so every bug here is a wrong claim about a real person.
 *
 * Two failures are worth guarding specifically: two orders from one phone showing
 * up as two customers (which makes a repeat buyer invisible), and revenue counting
 * orders that were never paid for (which makes an abandoned checkout look like
 * money). Fixtures go straight to the collection file rather than through
 * createOrder — that randomises uniqueAmount and cannot set a status or a date,
 * which is what these assertions are about.
 */

// DATA_DIR is set to a scratch directory by jest.setup.js — never src/data.
const ORDERS_FILE = path.join(process.cwd(), process.env.DATA_DIR, 'orders.json')

function order(overrides) {
  return {
    id: `ORD-${Math.random().toString(16).slice(2)}`,
    productId: 'tavana',
    plan: 'pro',
    customer: { name: 'علی رضایی', phone: '09123456789' },
    status: 'completed',
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

describe('getCustomers — grouping by phone', () => {
  it('collapses several orders from one phone into one customer', async () => {
    seed([
      order({ createdAt: '2026-01-01T00:00:00.000Z' }),
      order({ createdAt: '2026-02-01T00:00:00.000Z' }),
      order({ createdAt: '2026-03-01T00:00:00.000Z' }),
    ])

    const customers = await getCustomers()
    expect(customers.length).toBe(1)
    expect(customers[0].orderCount).toBe(3)
  })

  it('keeps two different phones apart even with the same name', async () => {
    seed([
      order({ customer: { name: 'علی رضایی', phone: '09123456789' } }),
      order({ customer: { name: 'علی رضایی', phone: '09120000000' } }),
    ])

    expect((await getCustomers()).length).toBe(2)
  })

  it('drops an order with no phone rather than inventing a customer', async () => {
    seed([
      order(),
      order({ customer: { name: 'ناشناس' } }),
    ])

    const customers = await getCustomers()
    expect(customers.length).toBe(1)
    expect(customers[0].phone).toBe('09123456789')
  })

  it('takes the name from the most recent order', async () => {
    seed([
      order({ customer: { name: 'علی رضای', phone: '09123456789' }, createdAt: '2026-01-01T00:00:00.000Z' }),
      order({ customer: { name: 'علی رضایی', phone: '09123456789' }, createdAt: '2026-02-01T00:00:00.000Z' }),
    ])

    expect((await getCustomers())[0].name).toBe('علی رضایی')
  })

  it('does not let a later blank field erase an earlier value', async () => {
    // The email box is optional, so a second order can legitimately arrive without
    // one. Overwriting with '' would lose the only address on file.
    seed([
      order({
        customer: { name: 'علی', phone: '09123456789', email: 'ali@example.com' },
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      order({
        customer: { name: 'علی', phone: '09123456789', email: '' },
        createdAt: '2026-02-01T00:00:00.000Z',
      }),
    ])

    expect((await getCustomers())[0].email).toBe('ali@example.com')
  })

  it('reports first and last order dates from the ends of the history', async () => {
    seed([
      order({ createdAt: '2026-03-01T00:00:00.000Z' }),
      order({ createdAt: '2026-01-01T00:00:00.000Z' }),
      order({ createdAt: '2026-02-01T00:00:00.000Z' }),
    ])

    const [customer] = await getCustomers()
    expect(customer.firstOrderAt).toBe('2026-01-01T00:00:00.000Z')
    expect(customer.lastOrderAt).toBe('2026-03-01T00:00:00.000Z')
  })

  it('lists order history newest first', async () => {
    seed([
      order({ id: 'ORD-old', createdAt: '2026-01-01T00:00:00.000Z' }),
      order({ id: 'ORD-new', createdAt: '2026-02-01T00:00:00.000Z' }),
    ])

    expect((await getCustomers())[0].orders[0].id).toBe('ORD-new')
  })

  it('sorts customers by most recent activity', async () => {
    seed([
      order({ customer: { name: 'قدیمی', phone: '09120000001' }, createdAt: '2026-01-01T00:00:00.000Z' }),
      order({ customer: { name: 'تازه', phone: '09120000002' }, createdAt: '2026-06-01T00:00:00.000Z' }),
    ])

    expect((await getCustomers()).map(c => c.name)).toEqual(['تازه', 'قدیمی'])
  })

  it('collects distinct products without repeating one bought twice', async () => {
    seed([
      order({ productId: 'tavana' }),
      order({ productId: 'tavana' }),
      order({ productId: 'rahyar' }),
    ])

    expect((await getCustomers())[0].products).toEqual(['tavana', 'rahyar'])
  })
})

describe('getCustomers — money', () => {
  it('counts only earning orders toward revenue', async () => {
    seed([
      order({ status: 'completed', uniqueAmount: 500_000 }),
      order({ status: 'rejected', uniqueAmount: 900_000 }),
      order({ status: 'awaiting_payment', uniqueAmount: 900_000 }),
    ])

    const [customer] = await getCustomers()
    expect(customer.orderCount).toBe(3)
    expect(customer.paidCount).toBe(1)
    expect(customer.revenue).toBe(500_000)
  })

  it('treats a missing uniqueAmount as zero rather than NaN', async () => {
    seed([order({ uniqueAmount: undefined })])

    expect((await getCustomers())[0].revenue).toBe(0)
  })

  it('counts receipts waiting on review', async () => {
    seed([
      order({ status: 'receipt_uploaded' }),
      order({ status: 'completed' }),
    ])

    expect((await getCustomers())[0].needsReview).toBe(1)
  })
})

describe('getCustomerStats', () => {
  it('separates paying customers from everyone who started a checkout', async () => {
    seed([
      order({ customer: { name: 'خریدار', phone: '09120000001' }, status: 'completed' }),
      order({ customer: { name: 'رهاکرده', phone: '09120000002' }, status: 'awaiting_payment' }),
    ])

    const stats = await getCustomerStats()
    expect(stats.total).toBe(2)
    expect(stats.paying).toBe(1)
  })

  it('counts a repeat buyer only after a second paid order', async () => {
    seed([
      order({ customer: { name: 'الف', phone: '09120000001' }, status: 'completed' }),
      // Two orders, but only one of them paid — not a repeat buyer yet.
      order({ customer: { name: 'الف', phone: '09120000001' }, status: 'rejected' }),
      order({ customer: { name: 'ب', phone: '09120000002' }, status: 'completed' }),
      order({ customer: { name: 'ب', phone: '09120000002' }, status: 'approved' }),
    ])

    const stats = await getCustomerStats()
    expect(stats.repeat).toBe(1)
  })

  it('averages over paying customers, not over everyone', async () => {
    // An abandoned checkout in the denominator would halve the figure and make the
    // product look cheaper than anyone actually paid.
    seed([
      order({ customer: { name: 'الف', phone: '09120000001' }, status: 'completed', uniqueAmount: 1_000_000 }),
      order({ customer: { name: 'ب', phone: '09120000002' }, status: 'awaiting_payment', uniqueAmount: 1_000_000 }),
    ])

    const stats = await getCustomerStats()
    expect(stats.averageRevenue).toBe(1_000_000)
  })

  it('returns zeroes on an empty collection instead of NaN', async () => {
    const stats = await getCustomerStats()
    expect(stats.total).toBe(0)
    expect(stats.paying).toBe(0)
    expect(stats.averageRevenue).toBe(0)
    expect(stats.revenue).toBe(0)
  })
})
