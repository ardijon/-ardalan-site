/**
 * Jalali dates without ICU.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `date.toLocaleDateString('fa-IR')` returns a Jalali date in Node and in every
 * browser, so the panel looked correct locally. On Cloudflare Workers it returns
 * a *Gregorian* date in Persian digits — workerd ships a trimmed ICU, and when
 * the Persian calendar data is missing the locale silently falls back to the
 * Gregorian one instead of failing. Silently, in Persian digits, is the worst
 * possible failure mode: ۲۰۲۶/۸/۲۳ looks like a real date to a skim.
 *
 * The same class of problem as the filesystem: an environment capability that is
 * present locally and absent in production. So the conversion is arithmetic here,
 * with no dependency on the runtime's locale data at all.
 *
 * WHY A FIXED TEHRAN OFFSET
 * -------------------------
 * A timestamp does not have a date until you pick a timezone, and the server
 * (UTC on Workers) and the browser (Tehran, usually) would otherwise disagree —
 * a receipt uploaded at 02:00 Tehran renders as the previous day server-side,
 * which is both wrong and a hydration mismatch. `timeZone: 'Asia/Tehran'` is
 * itself ICU data, so it is not available either. Iran abolished DST in 2022, so
 * the offset is a constant now and this is exact rather than an approximation.
 */

// +03:30, year-round since Iran dropped DST in 2022.
const TEHRAN_OFFSET_MS = 210 * 60 * 1000

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

/**
 * Column headers for a month grid, starting on Saturday.
 *
 * The Persian week starts on شنبه, not on Sunday — a grid built from a Gregorian
 * weekday index without this shift puts every day in the wrong column, which is
 * only visible if you already know which day of the week a date fell on.
 */
export const JALALI_WEEKDAY_INITIALS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

/**
 * Gregorian↔Jalali conversion, ported from jalaali-js (MIT).
 *
 * Deliberately left as opaque arithmetic rather than "cleaned up" — it is a
 * published algorithm whose correctness comes from the leap-year `BREAKS` table,
 * not from being readable. What guards it is `__tests__/jalali.test.js`, which
 * checks every day across a fifteen-year span against Node's full ICU. Do not
 * edit the numbers; if a conversion is ever wrong, that test is where to look.
 */
const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181,
  1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
]

const div = (a, b) => Math.trunc(a / b)
const mod = (a, b) => a - Math.trunc(a / b) * b

function jalCal(jy) {
  let leapJ = -14
  let jp = BREAKS[0]
  let jump = 0

  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }

  let n = jy - jp
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1

  const gy = jy + 621
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4

  return { leap, gy, march }
}

/** Gregorian calendar date → Julian Day Number. */
function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return d
}

/** Julian Day Number → Gregorian calendar date. */
function d2g(jdn) {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}

/** Jalali calendar date → Julian Day Number. Same source, same warning. */
function j2d(jy, jm, jd) {
  const r = jalCal(jy)
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}

/**
 * Gregorian y/m/d (1-based month) → Jalali `{ jy, jm, jd }`.
 * Exported for tests; callers want the formatters below.
 */
export function toJalali(gy, gm, gd) {
  const jdn = g2d(gy, gm, gd)
  const gregorianYear = d2g(jdn).gy
  let jy = gregorianYear - 621
  const r = jalCal(jy)
  const firstOfFarvardin = g2d(gregorianYear, 3, r.march)
  let k = jdn - firstOfFarvardin

  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }
    k -= 186
  } else {
    // Still in the previous Jalali year. `r.leap` is that of the year we started
    // from, not of the decremented one — reading it after `jy -= 1` shifts every
    // date in a leap year by a day, which is what the ICU cross-check caught.
    k += r.leap === 1 ? 180 : 179
    jy -= 1
  }

  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 }
}

/**
 * Jalali `(jy, jm, jd)` → Gregorian `{ gy, gm, gd }` — the inverse of toJalali.
 *
 * Reading a date needs only one direction; *entering* one needs both, because the
 * panel stores ISO timestamps and the admin picks a Jalali day. Guarded by a
 * round-trip over the same thirty-year span the forward test sweeps.
 */
export function toGregorian(jy, jm, jd) {
  return d2g(j2d(jy, jm, jd))
}

/** Whether a Jalali year has 366 days, i.e. whether Esfand has 30. */
export function isJalaliLeapYear(jy) {
  // `leap` is a distance-to-leap counter, so zero — not one — means this year.
  return jalCal(jy).leap === 0
}

/**
 * How many days a Jalali month has: 31, 30, or 29–30 for Esfand.
 *
 * The calendar grid needs this and so does validation. Hardcoding 31/30/29 is the
 * bug that eats ۳۰ اسفند in a leap year — a day that exists once every four years
 * and is a real birthday for some people.
 */
export function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return isJalaliLeapYear(jy) ? 30 : 29
}

/**
 * Which column of a Jalali month grid a day falls in — 0 is شنبه, 6 is جمعه.
 *
 * Goes through the Gregorian date because that is what `Date` can answer. UTC
 * throughout: this is a calendar position, not an instant, and asking a machine in
 * Los Angeles for `getDay()` on a UTC midnight would shift the whole grid a column.
 */
export function jalaliWeekday(jy, jm, jd) {
  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  return (new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay() + 1) % 7
}

/**
 * The ISO timestamp for the start of a Jalali day in Tehran.
 *
 * Midnight *Tehran*, not midnight UTC and not midnight wherever the browser is.
 * The whole file reads timestamps at a fixed +03:30, so writing them any other way
 * makes the picker hand back a date that renders as the day before in the very
 * list it was entered from — and only for admins in some timezones, which is the
 * kind of bug that gets reported as "sometimes it saves wrong".
 */
export function jalaliToISO(jy, jm, jd) {
  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  return new Date(Date.UTC(gy, gm - 1, gd) - TEHRAN_OFFSET_MS).toISOString()
}

/** Today in Tehran as `{ jy, jm, jd }` — what the picker opens on and highlights. */
export function todayJalali() {
  const p = jalaliParts(new Date())
  return { jy: p.jy, jm: p.jm, jd: p.jd }
}

/** '۱۴۰۵' from 1405. Digits only — never touches separators or dashes. */
export function toPersianDigits(value) {
  return String(value).replace(/\d/g, d => PERSIAN_DIGITS[Number(d)])
}

/**
 * The wall-clock parts of a timestamp in Tehran.
 *
 * Shifts the epoch and then reads the UTC fields, because `getFullYear()` would
 * use whatever timezone the machine happens to be in — the server's is UTC and
 * the admin's is Tehran, and the two must not print different days.
 */
function tehranParts(iso) {
  // Nullish and blank are rejected before Date sees them: `new Date(null)` is the
  // epoch, so a lead with no notifiedAt used to render as ۱۳۴۸/۱۰/۱۱ — a date that
  // looks real and means "this field is empty".
  if (iso === null || iso === undefined || (typeof iso === 'string' && iso.trim() === '')) return null

  const date = iso instanceof Date ? iso : new Date(iso)
  const ms = date.getTime()
  if (!Number.isFinite(ms)) return null

  const shifted = new Date(ms + TEHRAN_OFFSET_MS)
  return {
    gy: shifted.getUTCFullYear(),
    gm: shifted.getUTCMonth() + 1,
    gd: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  }
}

const pad = n => String(n).padStart(2, '0')

/**
 * The Jalali date a timestamp falls on in Tehran, or null if there isn't one.
 *
 * The primitive the formatters are built from, exported because grouping by month
 * needs the numbers rather than a string — pulling `jm` back out of '۱۴۰۵/۰۶/۰۱'
 * would mean parsing Persian digits to answer a question the converter already
 * knew the answer to.
 */
export function jalaliParts(iso) {
  const parts = tehranParts(iso)
  if (!parts) return null
  return { ...toJalali(parts.gy, parts.gm, parts.gd), hour: parts.hour, minute: parts.minute }
}

/**
 * '۱۴۰۵/۰۶/۰۱' — the panel's default date.
 *
 * Zero-padded so a column of dates lines up and can be compared by eye; the em
 * dash is returned for anything unparseable, which is how the panel already
 * renders a missing value everywhere else.
 */
export function formatJalali(iso) {
  const p = jalaliParts(iso)
  if (!p) return '—'
  return toPersianDigits(`${p.jy}/${pad(p.jm)}/${pad(p.jd)}`)
}

/** '۱۴۰۵/۰۶/۰۱ ۱۷:۳۷' — date plus Tehran wall clock, 24h. */
export function formatJalaliDateTime(iso) {
  const p = jalaliParts(iso)
  if (!p) return '—'
  return toPersianDigits(`${p.jy}/${pad(p.jm)}/${pad(p.jd)} ${pad(p.hour)}:${pad(p.minute)}`)
}

/** '۱ شهریور ۱۴۰۵' — for prose, where a slash-separated date reads as a code. */
export function formatJalaliLong(iso) {
  const p = jalaliParts(iso)
  if (!p) return '—'
  return toPersianDigits(`${p.jd} ${JALALI_MONTHS[p.jm - 1]} ${p.jy}`)
}

/**
 * A sortable key and a readable label for the Jalali month a timestamp falls in.
 *
 * The key stays in Latin digits on purpose: it is compared and sorted as a string,
 * and Persian digits do not sort in numeric order.
 */
export function jalaliMonthOf(iso) {
  const p = jalaliParts(iso)
  if (!p) return null
  return {
    key: `${p.jy}-${pad(p.jm)}`,
    label: `${JALALI_MONTHS[p.jm - 1]} ${toPersianDigits(p.jy)}`,
  }
}

/** '۱۴۰۵/۰۶' from an ISO month key like '2026-08'. Used by the revenue chart. */
export function formatJalaliMonth(key) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(key || ''))
  if (!match) return '—'
  // Mid-month, so the label cannot land on the boundary day where a Jalali month
  // has already rolled over but the Gregorian one has not.
  const { jy, jm } = toJalali(Number(match[1]), Number(match[2]), 15)
  return toPersianDigits(`${jy}/${pad(jm)}`)
}
