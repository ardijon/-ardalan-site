import {
  TRACKED_EVENTS,
  DAILY_WRITE_BUDGET,
  visitDayKey,
  recentDayKeys,
  recordVisit,
  readDays,
  summarizeVisits,
} from '@/lib/visit-stats'
import { jalaliParts } from '@/lib/jalali'

/**
 * Real behaviour, not a source scan.
 *
 * lib/storage.js keeps documents in a module-level Map when no KV binding is
 * present, which is exactly the case under jest — so read-modify-write can be
 * exercised end to end against a real store with nothing mocked. Each test uses
 * its own timestamp, because the day key is the document key: sharing a day would
 * mean sharing state between tests.
 */

// Well clear of every other date used below, so the budget test gets its own doc.
const BUDGET_DAY = new Date('2025-11-02T09:00:00Z')

describe('visitDayKey', () => {
  it('agrees with the Jalali calendar it is built on', () => {
    const at = new Date('2026-08-26T09:00:00Z')
    const parts = jalaliParts(at)
    expect(visitDayKey(at)).toBe(
      `${parts.jy}-${String(parts.jm).padStart(2, '0')}-${String(parts.jd).padStart(2, '0')}`
    )
  })

  it('sorts as a string, which is what the month rollup relies on', () => {
    expect(visitDayKey(new Date('2026-08-26T09:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('rolls over on Tehran midnight, not UTC midnight', () => {
    // 20:45Z is 00:15 the next day in Tehran (+03:30, no DST since 2022).
    const lateUtc = visitDayKey(new Date('2026-08-26T20:45:00Z'))
    const nextMorningTehran = visitDayKey(new Date('2026-08-27T05:00:00Z'))
    const sameDayTehran = visitDayKey(new Date('2026-08-26T12:00:00Z'))

    expect(lateUtc).toBe(nextMorningTehran)
    expect(lateUtc).not.toBe(sameDayTehran)
  })

  it('returns null for an unparsable date instead of a broken key', () => {
    expect(visitDayKey(new Date('not a date'))).toBeNull()
  })
})

describe('recentDayKeys', () => {
  it('returns the requested number of distinct days, newest first', () => {
    const keys = recentDayKeys(5, new Date('2026-08-26T09:00:00Z'))
    expect(keys).toHaveLength(5)
    expect(new Set(keys).size).toBe(5)
    expect(keys[0]).toBe(visitDayKey(new Date('2026-08-26T09:00:00Z')))
    expect([...keys].sort((a, b) => b.localeCompare(a))).toEqual(keys)
  })

  it('crosses a Jalali month boundary without repeating or skipping a day', () => {
    // 1405-06-31 is the last day of شهریور; the window has to step into مرداد.
    const keys = recentDayKeys(40, new Date('2026-09-22T09:00:00Z'))
    expect(new Set(keys).size).toBe(40)
    expect(new Set(keys.map(k => k.slice(0, 7))).size).toBeGreaterThan(1)
  })

  it('is empty for a non-positive count', () => {
    expect(recentDayKeys(0)).toEqual([])
    expect(recentDayKeys(-3)).toEqual([])
  })
})

describe('recordVisit', () => {
  it('accepts only the two tracked events', async () => {
    expect(TRACKED_EVENTS).toEqual(['open', 'read'])
    for (const event of ['click', 'purchase', '', 'OPEN', null]) {
      await expect(recordVisit({ slug: 'tavana', event })).resolves.toEqual({
        recorded: false,
        reason: 'invalid',
      })
    }
  })

  it('rejects a missing or blank slug', async () => {
    for (const slug of ['', '   ', null, 42]) {
      await expect(recordVisit({ slug, event: 'open' })).resolves.toEqual({
        recorded: false,
        reason: 'invalid',
      })
    }
  })

  it('counts opens and reads into separate buckets', async () => {
    const at = new Date('2025-10-05T09:00:00Z')
    const day = visitDayKey(at)

    await recordVisit({ slug: 'tavana', event: 'open', at })
    await recordVisit({ slug: 'tavana', event: 'open', at })
    await recordVisit({ slug: 'tavana', event: 'read', at })
    await recordVisit({ slug: 'rahyar', event: 'open', at })

    const [stored] = await readDays([day])
    expect(stored.opens).toEqual({ tavana: 2, rahyar: 1 })
    expect(stored.reads).toEqual({ tavana: 1 })
  })

  it('stops writing once the day is over budget, and does not overshoot it', async () => {
    for (let i = 0; i < DAILY_WRITE_BUDGET; i++) {
      const result = await recordVisit({ slug: 'tavana', event: 'open', at: BUDGET_DAY })
      expect(result.recorded).toBe(true)
    }

    await expect(recordVisit({ slug: 'tavana', event: 'open', at: BUDGET_DAY })).resolves.toEqual({
      recorded: false,
      reason: 'budget',
    })
    // The read bucket is refused too: the budget is per day, not per event type,
    // because the quota it protects is shared with orders and login.
    await expect(recordVisit({ slug: 'rahyar', event: 'read', at: BUDGET_DAY })).resolves.toEqual({
      recorded: false,
      reason: 'budget',
    })

    const [stored] = await readDays([visitDayKey(BUDGET_DAY)])
    expect(stored.opens.tavana).toBe(DAILY_WRITE_BUDGET)
    expect(stored.reads).toEqual({})
  })
})

describe('readDays', () => {
  it('returns a zeroed row for a day with nothing stored', async () => {
    const rows = await readDays(['1300-01-01'])
    expect(rows).toEqual([{ day: '1300-01-01', opens: {}, reads: {} }])
  })

  it('preserves the order it was asked for', async () => {
    const asked = ['1300-01-01', '1300-01-02', '1300-01-03']
    expect((await readDays(asked)).map(r => r.day)).toEqual(asked)
  })

  it('survives a non-array argument', async () => {
    await expect(readDays(undefined)).resolves.toEqual([])
  })
})

describe('summarizeVisits', () => {
  const docs = [
    { day: '1405-05-30', opens: { tavana: 10, rahyar: 4 }, reads: { tavana: 3 } },
    { day: '1405-06-01', opens: { tavana: 10 }, reads: { tavana: 2, rahyar: 1 } },
  ]

  it('totals across days and products', () => {
    const summary = summarizeVisits(docs)
    expect(summary.opens).toBe(24)
    expect(summary.reads).toBe(6)
    expect(summary.byProduct.tavana).toEqual({ opens: 20, reads: 5, readRate: 25 })
    expect(summary.byProduct.rahyar).toEqual({ opens: 4, reads: 1, readRate: 25 })
  })

  it('buckets by Jalali month with a Persian label, oldest first', () => {
    const summary = summarizeVisits(docs)
    expect(summary.byMonth.map(m => m.key)).toEqual(['1405-05', '1405-06'])
    expect(summary.byMonth[0].label).toBe('مرداد ۱۴۰۵')
    expect(summary.byMonth[1]).toEqual({ key: '1405-06', label: 'شهریور ۱۴۰۵', opens: 10, reads: 3 })
  })

  it('reports zero rather than NaN when nothing was opened', () => {
    const summary = summarizeVisits([])
    expect(summary).toMatchObject({ opens: 0, reads: 0, readRate: 0, byProduct: {}, byMonth: [] })
  })

  it('ignores corrupt counts instead of propagating NaN into the panel', () => {
    const summary = summarizeVisits([
      { day: '1405-06-01', opens: { tavana: 'nine', rahyar: 2 }, reads: { tavana: -1 } },
    ])
    expect(summary.opens).toBe(2)
    expect(summary.reads).toBe(0)
    expect(summary.byProduct.tavana).toBeUndefined()
    expect(Number.isNaN(summary.readRate)).toBe(false)
  })

  it('tolerates junk in place of the document list', () => {
    expect(summarizeVisits(null).opens).toBe(0)
    expect(summarizeVisits([null, {}, { day: '' }]).opens).toBe(0)
  })
})
