import fs from 'fs'
import path from 'path'
import { collectFiles, offendingLines, asRows } from './helpers/source-scan'
import {
  toJalali,
  toGregorian,
  isJalaliLeapYear,
  jalaliMonthLength,
  jalaliWeekday,
  jalaliToISO,
  JALALI_WEEKDAY_INITIALS,
  toPersianDigits,
  formatJalali,
  formatJalaliDateTime,
  formatJalaliLong,
  formatJalaliMonth,
} from '@/lib/jalali'

/**
 * The converter exists because workerd cannot be trusted to have the Persian
 * calendar, so its correctness cannot be argued from the runtime — it has to be
 * pinned by a test.
 *
 * Two layers. The anchors are dates whose Jalali value is independently known and
 * always run. The sweep compares every single day across a thirty-year span
 * against Node's full ICU, which is the only reference available that is not the
 * implementation itself; it is skipped rather than failed if the test runner's own
 * ICU is narrow, because that would be testing Node instead of this file.
 */

// Nowruz dates and well-known anniversaries — each verifiable without ICU. Shared,
// because a conversion that is wrong in both directions round-trips perfectly: the
// reverse test needs the same externally-known pairs, not just its own inverse.
const ANCHORS = [
  [[2026, 3, 21], [1405, 1, 1], 'Nowruz 1405'],
  [[2025, 3, 21], [1404, 1, 1], 'Nowruz 1404'],
  [[2024, 3, 20], [1403, 1, 1], 'Nowruz 1403 fell on the 20th'],
  [[2016, 3, 20], [1395, 1, 1], 'Nowruz 1395 fell on the 20th'],
  [[1979, 2, 11], [1357, 11, 22], '22 Bahman 1357'],
  [[2000, 1, 1], [1378, 10, 11], 'Y2K'],
  [[2026, 8, 23], [1405, 6, 1], '1 Shahrivar 1405'],
  [[2025, 3, 20], [1403, 12, 30], 'the last day of a leap year'],
]

const pad = n => String(n).padStart(2, '0')

describe('toJalali', () => {
  for (const [[gy, gm, gd], [jy, jm, jd], why] of ANCHORS) {
    it(`converts ${gy}-${gm}-${gd} to ${jy}/${jm}/${jd} (${why})`, () => {
      expect(toJalali(gy, gm, gd)).toEqual({ jy, jm, jd })
    })
  }

  it('should agree with ICU on every day from 2015 to 2045', () => {
    const format = new Intl.DateTimeFormat('en-u-ca-persian', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })

    if (format.resolvedOptions().calendar !== 'persian') {
      // The situation this whole file is a workaround for. Nothing to compare to.
      console.warn('skipped: this Node build has no Persian calendar data')
      return
    }

    const mismatches = []

    for (let t = Date.UTC(2015, 0, 1); t <= Date.UTC(2045, 0, 1); t += 86400000) {
      const date = new Date(t)
      const mine = toJalali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())

      const parts = format.formatToParts(date).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {})
      const icu = {
        jy: Number(parts.year.replace(/\D/g, '')),
        jm: Number(parts.month),
        jd: Number(parts.day),
      }

      if (mine.jy !== icu.jy || mine.jm !== icu.jm || mine.jd !== icu.jd) {
        mismatches.push(`${date.toISOString().slice(0, 10)}: got ${mine.jy}/${mine.jm}/${mine.jd}, ICU says ${icu.jy}/${icu.jm}/${icu.jd}`)
      }
    }

    expect(mismatches.slice(0, 10)).toEqual([])
  })
})

describe('toGregorian', () => {
  for (const [[gy, gm, gd], [jy, jm, jd], why] of ANCHORS) {
    it(`converts ${jy}/${jm}/${jd} back to ${gy}-${gm}-${gd} (${why})`, () => {
      expect(toGregorian(jy, jm, jd)).toEqual({ gy, gm, gd })
    })
  }

  it('should be the exact inverse of toJalali on every day from 2015 to 2045', () => {
    // The forward direction is pinned against ICU; this pins the reverse against the
    // forward one. Together that is enough — a conversion wrong in both directions
    // would still round-trip, which is why the anchors above are not optional.
    const mismatches = []

    for (let t = Date.UTC(2015, 0, 1); t <= Date.UTC(2045, 0, 1); t += 86400000) {
      const date = new Date(t)
      const [gy, gm, gd] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
      const { jy, jm, jd } = toJalali(gy, gm, gd)
      const back = toGregorian(jy, jm, jd)

      if (back.gy !== gy || back.gm !== gm || back.gd !== gd) {
        mismatches.push(`${gy}-${gm}-${gd} → ${jy}/${jm}/${jd} → ${back.gy}-${back.gm}-${back.gd}`)
      }
    }

    expect(mismatches.slice(0, 10)).toEqual([])
  })
})

describe('jalaliMonthLength', () => {
  it('should give the fixed lengths of the first eleven months', () => {
    for (let jm = 1; jm <= 6; jm += 1) expect(jalaliMonthLength(1405, jm)).toBe(31)
    for (let jm = 7; jm <= 11; jm += 1) expect(jalaliMonthLength(1405, jm)).toBe(30)
  })

  it('should give Esfand 30 days in a leap year and 29 otherwise', () => {
    // 1403 is the leap year the anchors already prove: 1403/12/30 exists.
    expect(isJalaliLeapYear(1403)).toBe(true)
    expect(jalaliMonthLength(1403, 12)).toBe(30)
    expect(jalaliMonthLength(1404, 12)).toBe(29)
  })

  it('should add up to the real distance between two Nowruz days', () => {
    // The test that matters, because the calendar grid is built from these numbers:
    // hardcoding 29 for Esfand silently eats ۳۰ اسفند, a day that exists once every
    // four years and is somebody's birthday. Checked against the converter, which is
    // itself checked against ICU.
    for (let jy = 1390; jy <= 1420; jy += 1) {
      const summed = Array.from({ length: 12 }, (_, i) => jalaliMonthLength(jy, i + 1))
        .reduce((a, b) => a + b, 0)

      const start = toGregorian(jy, 1, 1)
      const next = toGregorian(jy + 1, 1, 1)
      const actual = (Date.UTC(next.gy, next.gm - 1, next.gd) - Date.UTC(start.gy, start.gm - 1, start.gd)) / 86400000

      expect(summed).toBe(actual)
      expect(actual).toBe(isJalaliLeapYear(jy) ? 366 : 365)
    }
  })
})

describe('jalaliWeekday', () => {
  it('should put Nowruz 1405 in the Saturday column', () => {
    // 2026-03-21 was a Saturday, and شنبه is column zero.
    expect(jalaliWeekday(1405, 1, 1)).toBe(0)
    expect(JALALI_WEEKDAY_INITIALS[jalaliWeekday(1405, 1, 1)]).toBe('ش')
  })

  it('should name the day for a handful of known dates', () => {
    expect(JALALI_WEEKDAY_INITIALS[jalaliWeekday(1405, 6, 1)]).toBe('ی')   // 2026-08-23, Sunday
    expect(JALALI_WEEKDAY_INITIALS[jalaliWeekday(1403, 12, 30)]).toBe('پ') // 2025-03-20, Thursday
  })

  it('should advance exactly one column per day and never leave the week', () => {
    let previous = jalaliWeekday(1405, 1, 1)
    for (let jm = 1; jm <= 12; jm += 1) {
      for (let jd = 1; jd <= jalaliMonthLength(1405, jm); jd += 1) {
        const column = jalaliWeekday(1405, jm, jd)
        expect(column).toBeGreaterThanOrEqual(0)
        expect(column).toBeLessThan(7)
        if (!(jm === 1 && jd === 1)) expect(column).toBe((previous + 1) % 7)
        previous = column
      }
    }
  })

  it('should not depend on the machine timezone', () => {
    // A grid position is a calendar fact, not an instant. Reading it through local
    // time would shift the whole month by a column for admins west of UTC.
    const original = process.env.TZ
    try {
      for (const tz of ['UTC', 'Asia/Tehran', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
        process.env.TZ = tz
        expect(jalaliWeekday(1405, 1, 1)).toBe(0)
      }
    } finally {
      process.env.TZ = original
    }
  })
})

describe('jalaliToISO', () => {
  it('should be midnight in Tehran, not midnight UTC', () => {
    // 00:00 on Nowruz 1405 in Tehran is 20:30 the previous day in UTC.
    expect(jalaliToISO(1405, 1, 1)).toBe('2026-03-20T20:30:00.000Z')
  })

  it('should round-trip through formatJalali', () => {
    // The picker writes with this and every list in the panel reads with that. If
    // the two disagreed by even an hour, a date entered as ۱۵ مهر would appear as
    // ۱۴ مهر in the row it was entered from.
    for (let jy = 1400; jy <= 1412; jy += 1) {
      for (let jm = 1; jm <= 12; jm += 1) {
        for (const jd of [1, 15, jalaliMonthLength(jy, jm)]) {
          expect(formatJalali(jalaliToISO(jy, jm, jd))).toBe(toPersianDigits(`${jy}/${pad(jm)}/${pad(jd)}`))
        }
      }
    }
  })

  it('should not depend on the machine timezone', () => {
    const original = process.env.TZ
    try {
      for (const tz of ['UTC', 'Asia/Tehran', 'America/Los_Angeles']) {
        process.env.TZ = tz
        expect(jalaliToISO(1405, 6, 1)).toBe('2026-08-22T20:30:00.000Z')
      }
    } finally {
      process.env.TZ = original
    }
  })
})

describe('the Persian panel never shows a Gregorian date', () => {
  /**
   * Two ways a Gregorian date gets into the panel, both of which happened:
   *
   *   `<input type="date">` — the browser renders it in its own locale and calendar,
   *   so the release-date box read 08/10/2026 inside an otherwise Persian form. This
   *   is the one that survived the first Jalali pass, because it is an input rather
   *   than a formatter and nothing that formats dates ever touched it.
   *
   *   `toLocaleDateString` — correct in Node, wrong on workerd, which is the whole
   *   reason lib/jalali exists. It is still allowed in an `en` branch; what is banned
   *   is calling it unguarded.
   */
  const ADMIN_DIRS = [
    path.join(process.cwd(), 'src', 'components', 'Admin'),
    path.join(process.cwd(), 'src', 'app', 'admin'),
  ]
  const files = ADMIN_DIRS.flatMap(dir => collectFiles(dir))

  it('scans a non-empty set of files', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it.each(asRows(files))('%s uses no native date input', (_label, file) => {
    const source = fs.readFileSync(file, 'utf8')
    expect(offendingLines(source, /type=["']date["']/)).toEqual([])
  })

  it.each(asRows(files))('%s uses no locale date formatting', (_label, file) => {
    const source = fs.readFileSync(file, 'utf8')
    expect(offendingLines(source, /toLocaleDateString|toLocaleTimeString|toLocaleString/)).toEqual([])
  })
})

describe('toPersianDigits', () => {
  it('should convert digits and leave everything else alone', () => {
    expect(toPersianDigits('1405/06/01')).toBe('۱۴۰۵/۰۶/۰۱')
    expect(toPersianDigits('ORD-2026-7')).toBe('ORD-۲۰۲۶-۷')
  })
})
describe('formatJalali', () => {
  it('should zero-pad so a column of dates lines up', () => {
    expect(formatJalali('2026-08-23T10:00:00.000Z')).toBe('۱۴۰۵/۰۶/۰۱')
  })

  it('should read the date in Tehran, not UTC', () => {
    // 21:30Z is 01:00 the next day in Tehran. Rendering the UTC day here would
    // print yesterday's date on an order the admin watched arrive.
    expect(formatJalali('2026-08-22T21:30:00.000Z')).toBe('۱۴۰۵/۰۶/۰۱')
    expect(formatJalali('2026-08-22T20:00:00.000Z')).toBe('۱۴۰۵/۰۵/۳۱')
  })

  it('should not depend on the machine timezone', () => {
    // The server runs in UTC and the admin's browser in Tehran; if these differed
    // the same timestamp would render two ways and React would flag a mismatch.
    const iso = '2026-08-22T21:30:00.000Z'
    const original = process.env.TZ

    try {
      process.env.TZ = 'UTC'
      const asUtc = formatJalali(iso)
      process.env.TZ = 'Asia/Tehran'
      expect(formatJalali(iso)).toBe(asUtc)
      process.env.TZ = 'America/Los_Angeles'
      expect(formatJalali(iso)).toBe(asUtc)
    } finally {
      process.env.TZ = original
    }
  })

  it('should return an em dash for anything unparseable', () => {
    for (const bad of [undefined, null, '', 'not a date', {}]) {
      expect(formatJalali(bad)).toBe('—')
    }
  })
})

describe('formatJalaliDateTime', () => {
  it('should append the Tehran wall clock in 24h form', () => {
    expect(formatJalaliDateTime('2026-08-23T14:07:00.000Z')).toBe('۱۴۰۵/۰۶/۰۱ ۱۷:۳۷')
  })

  it('should pad a single-digit hour', () => {
    expect(formatJalaliDateTime('2026-08-23T02:05:00.000Z')).toBe('۱۴۰۵/۰۶/۰۱ ۰۵:۳۵')
  })

  it('should return an em dash for anything unparseable', () => {
    expect(formatJalaliDateTime('nope')).toBe('—')
  })
})

describe('formatJalaliLong', () => {
  it('should name the month for prose', () => {
    expect(formatJalaliLong('2026-08-23T10:00:00.000Z')).toBe('۱ شهریور ۱۴۰۵')
    expect(formatJalaliLong('2026-03-21T10:00:00.000Z')).toBe('۱ فروردین ۱۴۰۵')
  })

  it('should return an em dash for anything unparseable', () => {
    expect(formatJalaliLong(null)).toBe('—')
  })
})

describe('formatJalaliMonth', () => {
  it('should convert the ISO month keys the order stats produce', () => {
    // getOrderStats().byMonth is keyed 'YYYY-MM' precisely to stay ICU-free.
    expect(formatJalaliMonth('2026-08')).toBe('۱۴۰۵/۰۵')
    expect(formatJalaliMonth('2026-04')).toBe('۱۴۰۵/۰۱')
  })

  it('should return an em dash for a key that is not a month', () => {
    for (const bad of ['2026', '2026-8', '', null, undefined]) {
      expect(formatJalaliMonth(bad)).toBe('—')
    }
  })
})
