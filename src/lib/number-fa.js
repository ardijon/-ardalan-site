/**
 * Persian number formatting without ICU.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `Number.toLocaleString('fa-IR')` depends on the runtime's ICU, and workerd
 * ships a trimmed one — the same reason lib/jalali.js exists. On Workers the
 * call can silently fall back to Latin digits or drop the grouping separator
 * entirely, which is exactly the price rendering the store shows today:
 * "9900000" in English digits with no thousand separators.
 *
 * `toLocaleString` is also *inconsistent across environments* even where it
 * works: Node groups with U+066C (Arabic thousands separator) while some
 * browsers use U+066B or a plain comma. The panel's `toman()` in Admin/shared.js
 * already hand-rolls its grouping for this reason; this file is the same idea
 * for the storefront, so every Persian price on the site renders identically.
 */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

/** U+066C ARABIC THOUSANDS SEPARATOR — the standard grouping mark in Persian text. */
const FA_THOUSANDS = '٬'

/** U+066B ARABIC DECIMAL SEPARATOR — the standard decimal mark in Persian text. */
const FA_DECIMAL = '٫'

/**
 * '۹,۹۰۰,۰۰۰' from 9900000 — grouped, Persian digits.
 *
 * The group-then-convert order matters: converting first would leave nothing for
 * the regex to group (Persian digits are not matched by `\d`, which is ASCII-only
 * without the `u` flag). Absent, infinite, and NaN fall back to '۰' rather than
 * printing "NaN" in the middle of a price.
 */
export function formatFaNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return FA_DIGITS[0]

  const [whole, ...fractionParts] = Math.abs(n).toString().split('.')
  const grouped = toFa(whole.replace(/\B(?=(\d{3})+(?!\d))/g, FA_THOUSANDS))
  const sign = n < 0 ? '-' : ''
  const fraction = fractionParts.length ? FA_DECIMAL + toFa(fractionParts.join('')) : ''
  return sign + grouped + fraction
}

/**
 * Convert ASCII digits inside a string to Persian digits, leaving everything else.
 *
 * Used on the price string the admin typed into «قیمت نمایشی (فارسی)»: the panel
 * cannot stop someone pasting "9900000" there, but the store should still render
 * it as ۹۹۰۰۰۰۰ rather than showing English digits in the middle of a Persian page.
 * Separators the admin typed survive untouched, so a deliberate
 * «۹,۹۰۰,۰۰۰ تومان» stays as written.
 */
export function toPersianDigitChars(text) {
  return String(text).replace(/\d/g, d => FA_DIGITS[Number(d)])
}

function toFa(grouped) {
  return grouped.replace(/\d/g, d => FA_DIGITS[Number(d)])
}

/** Only ASCII digits, thousands/decimal separators, and whitespace — nothing else. */
function isBareNumber(text) {
  return text !== '' && /^[\d.,\s]+$/.test(text)
}

/** Drop grouping and stray spaces so Number() can read the rest. */
function parseBareNumber(text) {
  return Number(text.replace(/[^\d.]/g, ''))
}

/**
 * What a price spot on the store should actually print.
 *
 * The panel's «قیمت نمایشی (فارسی)» is free text, so its content is whatever was
 * typed — including a bare "9900000", which used to render verbatim: no grouping,
 * Latin digits, Latin font. This decides per locale:
 *
 * - fa: a bare numeric display ("9900000", "9,900,000") is regenerated from the
 *   plan's numeric `price` — Persian digits and thousands grouping restored. Any
 *   display with letters ("۳ تا ۳.۵ میلیون تومان", "$5") is respected as typed,
 *   because re-formatting a range or a currency label from a number is impossible;
 *   only its Latin digits are converted to Persian. An empty display falls back to
 *   the numeric price, so a plan with a price can no longer render a blank line.
 * - en: the display string as entered, or the number grouped with commas.
 *
 * Returns '' when there is nothing to show, so call sites keep their existing
 * conditional rendering.
 */
export function priceText(display, numericPrice, locale) {
  const displayText = typeof display === 'string' ? display.trim() : ''
  const price = Number(numericPrice)

  if (locale === 'fa') {
    if (isBareNumber(displayText)) {
      if (Number.isFinite(price) && price > 0) return formatFaNumber(price)
      const parsed = parseBareNumber(displayText)
      return Number.isFinite(parsed) ? formatFaNumber(parsed) : ''
    }
    if (displayText) return toPersianDigitChars(displayText)
    return Number.isFinite(price) && price > 0 ? formatFaNumber(price) : ''
  }

  if (displayText) return displayText
  return Number.isFinite(price) && price > 0 ? formatEnNumber(price) : ''
}

/**
 * priceText over a plan-shaped object ({ price, priceDisplay: { fa, en } }).
 *
 * The call sites previously inlined `priceDisplay?.[locale] || priceDisplay?.en`
 * four times; this is that fallback plus the formatting rules in one place.
 */
export function planPriceLine(plan, locale) {
  if (!plan) return ''
  return priceText(plan.priceDisplay?.[locale] || plan.priceDisplay?.en, plan.price, locale)
}

/** priceText over a priceSummary-shaped object ({ price, display: { fa, en } }). */
export function summaryPriceLine(summary, locale) {
  if (!summary) return ''
  return priceText(summary.display?.[locale] || summary.display?.en, summary.price, locale)
}

/**
 * '9,900,000' from 9900000 — the Latin-side counterpart of formatFaNumber.
 *
 * Hand-rolled rather than `toLocaleString('en-US')` because the admin panel is
 * scanned by __tests__/jalali.test.js for any locale-dependent formatting call:
 * workerd's trimmed ICU makes those unreliable, and this output is fixed anyway.
 */
export function formatEnNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  const [whole, ...fractionParts] = Math.abs(n).toString().split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (n < 0 ? '-' : '') + grouped + (fractionParts.length ? '.' + fractionParts.join('') : '')
}

/**
 * The canonical Persian money format for customer-facing screens:
 * formatFaNumber + ' تومان'.
 *
 * Lives here rather than staying in Admin/shared.js so public components (the
 * order tracker) can use the same formatter without importing an admin module —
 * the panel bundle used to ride along into the public tracking page for one
 * function.
 */
export function toman(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return formatFaNumber(0)
  return formatFaNumber(amount)
}
