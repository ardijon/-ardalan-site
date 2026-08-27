import fs from 'fs'
import path from 'path'
import {
  recordAudit,
  readAudit,
  auditSummary,
  AUDIT_LIMIT,
  AUDIT_ACTIONS,
  AUDIT_ACTION_KEYS,
  AUDIT_ACTORS,
} from '@/lib/audit'
import { updateOrderStatus, uploadReceipt } from '@/lib/orders'
import { ORDER_STATUSES, ORDER_STATUS_KEYS, orderStatusLabel } from '@/lib/order-status'
import { recordFailedAttempt, resetAttempts } from '@/lib/admin-auth'
import { collectFiles, offendingLines } from './helpers/source-scan'

/**
 * The log has to be the one thing in the panel that is never wrong.
 *
 * Everything else can be re-derived: revenue from the orders, a status from its
 * history. An audit entry is the only record that an event happened at all, so the
 * failure modes worth testing are the silent ones — an entry that was dropped, a log
 * that reads as empty because it is out of order, or a mutation that completed
 * without leaving a trace.
 *
 * And the inverse, which matters just as much: recording must never be able to fail
 * the thing it is recording. Approving a payment twice because the log threw a 500
 * is a worse outcome than losing the log entry.
 */

// DATA_DIR is set to a scratch directory by jest.setup.js — never src/data.
const DATA = path.join(process.cwd(), process.env.DATA_DIR)
const AUDIT_FILE = path.join(DATA, 'audit.json')
const ORDERS_FILE = path.join(DATA, 'orders.json')

function seed(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value), 'utf8')
}

function stored() {
  return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'))
}

function order(overrides) {
  return {
    id: 'ORD-1',
    productId: 'tavana',
    plan: 'pro',
    customer: { name: 'مریم رضایی', phone: '09123456789', domain: 'example.ir' },
    status: 'awaiting_payment',
    uniqueAmount: 1_000_000,
    createdAt: '2026-05-10T09:00:00.000Z',
    updatedAt: '2026-05-10T09:00:00.000Z',
    statusHistory: [],
    ...overrides,
  }
}

beforeEach(() => {
  seed(AUDIT_FILE, [])
  seed(ORDERS_FILE, [])
})

describe('recordAudit', () => {
  it('stores the fields the panel renders', async () => {
    const record = await recordAudit({
      action: 'product.update',
      entityId: 'tavana',
      summary: 'ویرایش «توانا»',
    })

    expect(record).toMatchObject({
      action: 'product.update',
      entityId: 'tavana',
      summary: 'ویرایش «توانا»',
      // Unattributed entries are the admin's — every other actor is explicit.
      actor: AUDIT_ACTORS.ADMIN,
    })
    expect(record.id).toBeTruthy()
    expect(Number.isFinite(new Date(record.at).getTime())).toBe(true)
    expect(stored()).toHaveLength(1)
  })

  it('omits the ip unless one was passed', async () => {
    // On an admin action the address is always the same and is pure noise; on a
    // blocked login it is the only useful field. So its absence is deliberate, and
    // an `ip: undefined` key would serialise into every row of the log.
    const plain = await recordAudit({ action: 'product.create', summary: 'x' })
    expect('ip' in plain).toBe(false)

    const blocked = await recordAudit({ action: 'auth.blocked', summary: 'y', ip: '1.2.3.4' })
    expect(blocked.ip).toBe('1.2.3.4')
  })

  it('keeps newest first', async () => {
    await recordAudit({ action: 'auth.login', summary: 'اول' })
    await recordAudit({ action: 'auth.login', summary: 'دوم' })
    await recordAudit({ action: 'auth.login', summary: 'سوم' })

    // In storage as well as on read, so that trimming is a truncation of the tail
    // rather than a re-sort of the whole array on every append.
    expect(stored().map(e => e.summary)).toEqual(['سوم', 'دوم', 'اول'])
    expect((await readAudit()).map(e => e.summary)).toEqual(['سوم', 'دوم', 'اول'])
  })

  it('drops the oldest entries past the cap', async () => {
    // Seeded rather than appended one call at a time: the cap is 300, and 300 real
    // read-modify-write cycles is a slow test that proves the same one line.
    const old = Array.from({ length: AUDIT_LIMIT }, (_, i) => ({
      id: `old-${i}`,
      at: `2026-01-01T00:00:${String(i % 60).padStart(2, '0')}.000Z`,
      action: 'auth.login',
      actor: 'admin',
      entityId: '',
      summary: `قدیمی ${i}`,
    }))
    seed(AUDIT_FILE, old)

    await recordAudit({ action: 'auth.login', summary: 'تازه' })

    const log = stored()
    expect(log).toHaveLength(AUDIT_LIMIT)
    expect(log[0].summary).toBe('تازه')
    // The one that fell off is the last, not a random one.
    expect(log.at(-1).summary).toBe(`قدیمی ${AUDIT_LIMIT - 2}`)
  })

  it('refuses an action outside the vocabulary', async () => {
    // A typo'd action would write a row the panel cannot label and no filter can
    // find — worse than no row, because the log then looks complete.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(await recordAudit({ action: 'order.frobnicate', summary: 'x' })).toBeNull()
      expect(await recordAudit({ summary: 'no action at all' })).toBeNull()
      expect(stored()).toEqual([])
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it('falls back to the action label when no summary was given', async () => {
    const record = await recordAudit({ action: 'order.deploy' })
    expect(record.summary).toBe(AUDIT_ACTIONS['order.deploy'].label)
  })

  it('returns null instead of throwing when storage is unwritable', async () => {
    // The log is a record of the work, not the work. A KV hiccup while appending
    // must not turn an approved payment into a 500 that the admin then retries,
    // because retrying is how an order gets approved twice.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const realDir = process.env.DATA_DIR
    // An ancestor that is a file, so mkdir cannot create the directory.
    process.env.DATA_DIR = path.join('package.json', 'nowhere')
    try {
      await expect(recordAudit({ action: 'auth.login', summary: 'x' })).resolves.toBeNull()
    } finally {
      process.env.DATA_DIR = realDir
      spy.mockRestore()
    }
  })
})

describe('readAudit', () => {
  const entry = (at, action, summary) => ({
    id: at,
    at,
    action,
    actor: 'admin',
    entityId: '',
    summary,
  })

  it('re-sorts a log that was edited out of order by hand', async () => {
    // The file driver's JSON is a real file someone can open. A log that renders
    // oldest-first reads as "nothing happened lately", which is the one thing a log
    // must never say by accident.
    seed(AUDIT_FILE, [
      entry('2026-01-01T00:00:00.000Z', 'auth.login', 'قدیمی'),
      entry('2026-08-01T00:00:00.000Z', 'auth.login', 'تازه'),
      entry('2026-04-01T00:00:00.000Z', 'auth.login', 'میانه'),
    ])

    expect((await readAudit()).map(e => e.summary)).toEqual(['تازه', 'میانه', 'قدیمی'])
  })

  it('filters by action', async () => {
    seed(AUDIT_FILE, [
      entry('2026-08-03T00:00:00.000Z', 'product.update', 'ویرایش'),
      entry('2026-08-02T00:00:00.000Z', 'auth.login', 'ورود'),
      entry('2026-08-01T00:00:00.000Z', 'product.update', 'ویرایش دیگر'),
    ])

    const rows = await readAudit({ action: 'product.update' })
    expect(rows.map(e => e.summary)).toEqual(['ویرایش', 'ویرایش دیگر'])
  })

  it('clamps the limit to the cap and to at least one row', async () => {
    seed(AUDIT_FILE, Array.from({ length: 12 }, (_, i) =>
      entry(`2026-08-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`, 'auth.login', `#${i}`)
    ))

    expect(await readAudit({ limit: 3 })).toHaveLength(3)
    // A caller asking for everything gets the cap, not an unbounded response.
    expect((await readAudit({ limit: 100_000 })).length).toBeLessThanOrEqual(AUDIT_LIMIT)
    // Garbage must not produce an empty log — the panel would read that as no history.
    expect((await readAudit({ limit: -5 })).length).toBeGreaterThan(0)
    expect((await readAudit({ limit: 'همه' })).length).toBeGreaterThan(0)
  })

  it('returns an empty list rather than throwing when the log is not an array', async () => {
    seed(AUDIT_FILE, { corrupted: true })
    expect(await readAudit()).toEqual([])
  })
})

describe('a mutation cannot happen without leaving a trace', () => {
  it('records a status change, with who and why', async () => {
    seed(ORDERS_FILE, [order()])

    await updateOrderStatus('ORD-1', 'approved', 'رسید با صورتحساب مطابقت داشت')

    const [row] = await readAudit()
    expect(row.action).toBe('order.status')
    expect(row.entityId).toBe('ORD-1')
    expect(row.actor).toBe(AUDIT_ACTORS.ADMIN)
    // The customer's name and the note, because "ORD-1: تایید شده" alone is not
    // something you can skim a month later.
    expect(row.summary).toContain('مریم رضایی')
    expect(row.summary).toContain(ORDER_STATUSES.approved)
    expect(row.summary).toContain('رسید با صورتحساب مطابقت داشت')
  })

  it('does not record a status change for an order that does not exist', async () => {
    expect(await updateOrderStatus('ORD-MISSING', 'approved')).toBeNull()
    expect(await readAudit()).toEqual([])
  })

  it('attributes a receipt to the customer, not the admin', async () => {
    seed(ORDERS_FILE, [order()])

    await uploadReceipt('ORD-1', { filename: 'r.jpg', amount: 1_000_000, trackingCode: 'T1' })

    const [row] = await readAudit()
    expect(row.action).toBe('order.receipt')
    expect(row.actor).toBe(AUDIT_ACTORS.CUSTOMER)
    expect(row.entityId).toBe('ORD-1')
  })

  it('does not record a receipt the order refused', async () => {
    // A row claiming a receipt arrived, for an upload that was rejected, is a lie
    // in the one place that has to be trustworthy.
    seed(ORDERS_FILE, [order({ status: 'completed' })])

    const result = await uploadReceipt('ORD-1', { filename: 'r.jpg' })
    expect(result.error).toBeTruthy()
    expect(await readAudit()).toEqual([])
  })

  it('leaves statusHistory alone', async () => {
    // The two logs answer different questions and neither replaces the other:
    // statusHistory is the customer's timeline on the tracking page.
    seed(ORDERS_FILE, [order()])

    const updated = await updateOrderStatus('ORD-1', 'approved', 'ok')
    expect(updated.statusHistory.at(-1)).toMatchObject({ status: 'approved', note: 'ok' })
  })
})

describe('auditSummary', () => {
  it('names an order even when the customer is missing', async () => {
    // Every summary is built from data that may be partial. An exception thrown
    // while phrasing a log entry would take down the operation being logged.
    expect(auditSummary.orderStatus({ id: 'ORD-9' }, 'approved')).toContain('ORD-9')
    expect(auditSummary.orderStatus(null, 'approved')).toContain(ORDER_STATUSES.approved)
    expect(auditSummary.receipt(null)).toBeTruthy()
    expect(auditSummary.deploy(null)).toBeTruthy()
    expect(auditSummary.product('حذف', null)).toBeTruthy()
    expect(auditSummary.blocked(null)).toBeTruthy()
  })

  it('says why a deploy failed', async () => {
    const failed = auditSummary.deploy(order(), { error: 'دامنه پاسخ نداد' })
    expect(failed).toContain('ناموفق')
    expect(failed).toContain('دامنه پاسخ نداد')
    // The domain, because that is what identifies the deploy target.
    expect(failed).toContain('example.ir')

    expect(auditSummary.deploy(order())).not.toContain('ناموفق')
  })

  it('prefers a product title over its slug', async () => {
    expect(auditSummary.product('ویرایش', { slug: 'tavana', title: { fa: 'توانا' } })).toContain('توانا')
    // Falls back rather than rendering «undefined» for a product with no title.
    expect(auditSummary.product('ویرایش', { slug: 'tavana' })).toContain('tavana')
  })
})

describe('order statuses have exactly one definition', () => {
  it('labels every status the API accepts', async () => {
    for (const key of ORDER_STATUS_KEYS) {
      expect(typeof ORDER_STATUSES[key]).toBe('string')
      expect(ORDER_STATUSES[key].length).toBeGreaterThan(0)
    }
  })

  it('falls back to the raw key instead of rendering undefined', async () => {
    expect(orderStatusLabel('approved')).toBe(ORDER_STATUSES.approved)
    // A status written by an older build should still read as something.
    expect(orderStatusLabel('legacy_status')).toBe('legacy_status')
    expect(orderStatusLabel(undefined)).toBe('—')
  })

  it('is not re-declared anywhere else', async () => {
    // The route's `validStatuses` array and the panel's `STATUS_LABELS` object used
    // to be written out separately, and had already diverged — the route accepted a
    // status the panel rendered as an empty badge.
    const files = [
      ...collectFiles(path.join(process.cwd(), 'src', 'components', 'Admin')),
      ...collectFiles(path.join(process.cwd(), 'src', 'app', 'api', 'admin')),
    ]
    expect(files.length).toBeGreaterThan(5)

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')
      expect(offendingLines(source, /awaiting_payment.*receipt_uploaded/)).toEqual([])
    }
  })
})

describe('every audit call site uses a known action', () => {
  /**
   * Scanned rather than trusted, because the failure is silent by construction.
   *
   * `recordAudit` refuses an unknown action, and it refuses it at runtime — on the
   * one code path that only runs when someone actually deploys a product or gets
   * locked out. A typo there would sit in the source until the day it mattered.
   */
  const sources = collectFiles(path.join(process.cwd(), 'src'))

  it('finds the call sites at all', () => {
    const total = sources.filter(f => fs.readFileSync(f, 'utf8').includes('recordAudit(')).length
    // lib/orders, lib/audit itself, and the products / deploy / otp routes.
    expect(total).toBeGreaterThanOrEqual(4)
  })

  it('passes only actions the vocabulary knows', () => {
    const used = new Set()
    for (const file of sources) {
      const source = fs.readFileSync(file, 'utf8')
      // Only dotted literals, so this cannot collide with an unrelated `action:`
      // prop somewhere in the components.
      for (const match of source.matchAll(/action:\s*'([a-z_]+\.[a-z_]+)'/g)) {
        used.add(match[1])
      }
    }

    expect(used.size).toBeGreaterThan(0)
    for (const action of used) {
      expect(AUDIT_ACTION_KEYS).toContain(action)
    }
  })

  it('gives every action a label and a tone the panel can style', () => {
    for (const [key, meta] of Object.entries(AUDIT_ACTIONS)) {
      expect(typeof meta.label).toBe('string')
      expect(meta.label.length).toBeGreaterThan(0)
      expect(['default', 'info', 'good', 'bad']).toContain(meta.tone)
      // Dotted, because the panel groups on the prefix.
      expect(key).toMatch(/^[a-z_]+\.[a-z_]+$/)
    }
  })
})

describe('the audit route is read-only', () => {
  const ROUTE = path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'audit', 'route.js')

  it('exports no mutating handler', () => {
    // A log the panel can write to is not a log. Entries come from the code that
    // performed the action, which is the only thing that knows it happened.
    const source = fs.readFileSync(ROUTE, 'utf8')
    expect(offendingLines(source, /export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/)).toEqual([])
    expect(source).toContain('export async function GET')
  })

  it('goes through the shared admin guard', () => {
    const source = fs.readFileSync(ROUTE, 'utf8')
    expect(source).toContain('guardAdminRoute')
  })
})

describe('recordFailedAttempt reports the attempt that trips the limit', () => {
  /**
   * The return value is what keeps the log from becoming a denial of service.
   *
   * Auditing every failed guess is one KV write per guess, so a brute-force attempt
   * would burn the daily write quota and take the orders collection down with it —
   * an outage handed to the attacker by the logging. Only the blocking attempt gets
   * a row, which is roughly one per address per window.
   */
  const IP = '203.0.113.7'

  beforeEach(() => resetAttempts(IP))
  afterEach(() => resetAttempts(IP))

  it('returns false until the allowance runs out, then true exactly once', async () => {
    const results = []
    for (let i = 0; i < 7; i++) results.push(await recordFailedAttempt(IP))

    // Five attempts allowed: the fifth is the one that blocks.
    expect(results.slice(0, 4)).toEqual([false, false, false, false])
    expect(results[4]).toBe(true)
    // Equality, not `>=` — otherwise every further guess writes the same row again.
    expect(results.slice(5)).toEqual([false, false])
  })

  it('starts over after a reset', async () => {
    for (let i = 0; i < 5; i++) await recordFailedAttempt(IP)
    await resetAttempts(IP)
    expect(await recordFailedAttempt(IP)).toBe(false)
  })
})
