import fs from 'fs'
import path from 'path'
import { collectFiles, offendingLines } from './helpers/source-scan'

/**
 * Guards the claims the site is allowed to make.
 *
 * The store used to advertise a 7-day money-back guarantee in six places. It was
 * never implemented anywhere — no terms page, nothing in `src/lib/orders.js`, no
 * refund path at all. An unbacked financial promise on a 14.9M-toman product is a
 * liability, so it was removed. Two of those six places were dictionary keys no
 * component rendered, which is exactly how the claim would come back: someone
 * builds the FAQ section those keys were waiting for and ships the promise again.
 *
 * "قالب" (template) is banned for a different reason: these are web applications
 * with a database, an admin panel and a Telegram bot. Calling one a template
 * resets the buyer's price anchor by an order of magnitude.
 */

const SRC = path.join(process.cwd(), 'src')

const BANNED = [
  { label: '7-day guarantee (fa)', pattern: /ضمانت\s*۷\s*روزه/, why: 'وعده‌ی بازگشت وجه ۷ روزه پیاده‌سازی نشده است' },
  { label: '7-day guarantee (en)', pattern: /7-Day Guarantee/i, why: 'the 7-day guarantee is not implemented' },
  { label: 'money-back (en)', pattern: /money-back guarantee/i, why: 'no refund path exists in orders.js' },
  { label: 'refund (fa)', pattern: /بازگشت وجه/, why: 'no refund path exists in orders.js' },
  // The admin panel's internal copy-paste helpers legitimately say «قالب تایید» /
  // «قالب پیام» — those are tools for the operator, not a claim shown to a buyer.
  { label: 'template (fa)', pattern: /قالب(?!\s*(تایید|پیام))/, why: 'محصول یک وب‌اپلیکیشن است، نه قالب' },
]

// products.json carries user-facing copy too, and being data it is the easiest
// place for a banned claim to slip past a code review.
const files = [...collectFiles(SRC), path.join(SRC, 'data', 'products.json')]

describe('the site only makes claims it can back', () => {
  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(BANNED.map(b => [b.label, b]))('%s appears nowhere in src/', (_label, banned) => {
    const offenders = []

    for (const full of files) {
      const source = fs.readFileSync(full, 'utf8')
      const relative = path.relative(process.cwd(), full)

      for (const hit of offendingLines(source, banned.pattern)) {
        offenders.push(`${relative}:${hit} — ${banned.why}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
