import { formatFaNumber, formatEnNumber, toPersianDigitChars, priceText, planPriceLine, summaryPriceLine } from '@/lib/number-fa'

/**
 * lib/number-fa.js exists because `toLocaleString('fa-IR')` is not trustworthy on
 * workerd (trimmed ICU) and because the admin's free-text display field can hold
 * a raw "9900000". These tests pin the exact output — Persian digits, U+066C
 * grouping — byte for byte, since "roughly right" is how the silent ICU fallback
 * slipped through in the first place.
 */

const FA = {
  group: '٬',
  zero: '۰',
  nineMillionNine: '۹٬۹۰۰٬۰۰۰',
}

describe('formatFaNumber', () => {
  it('groups thousands with U+066C and converts digits', () => {
    expect(formatFaNumber(9900000)).toBe(FA.nineMillionNine)
  })

  it('handles the starter price', () => {
    expect(formatFaNumber(490000)).toBe('۴۹۰٬۰۰۰')
  })

  it('returns ۰ for NaN, Infinity, null, undefined', () => {
    for (const bad of [NaN, Infinity, -Infinity, null, undefined, 'abc']) {
      expect(formatFaNumber(bad)).toBe(FA.zero)
    }
  })

  it('keeps the sign for negatives', () => {
    expect(formatFaNumber(-1500)).toBe('-۱٬۵۰۰')
  })

  it('formats the decimal part with U+066B', () => {
    expect(formatFaNumber(3.5)).toBe('۳٫۵')
  })

  it('accepts numeric strings', () => {
    expect(formatFaNumber('9900000')).toBe(FA.nineMillionNine)
  })

  it('does not group 4-digit numbers', () => {
    expect(formatFaNumber(1234)).toBe('۱٬۲۳۴')
    expect(formatFaNumber(999)).toBe('۹۹۹')
  })
})

describe('toPersianDigitChars', () => {
  it('converts digits inside mixed text, leaving everything else', () => {
    expect(toPersianDigitChars('3 تا 3.5 میلیون')).toBe('۳ تا ۳.۵ میلیون')
  })

  it('leaves Persian digits as they are', () => {
    expect(toPersianDigitChars('۱۴۰۴')).toBe('۱۴۰۴')
  })

  it('passes non-numeric text through untouched', () => {
    expect(toPersianDigitChars('تماس برای قیمت')).toBe('تماس برای قیمت')
  })
})

describe('priceText (fa)', () => {
  it('regenerates a bare-number display from the numeric price, restoring grouping', () => {
    // The exact defect reported: the admin typed the raw number into the display
    // field and the store printed it verbatim.
    expect(priceText('9900000', 9900000, 'fa')).toBe(FA.nineMillionNine)
  })

  it('regenerates from the numeric price even when the display has separators', () => {
    expect(priceText('9,900,000', 9900000, 'fa')).toBe(FA.nineMillionNine)
  })

  it('prefers the numeric price over a bare display that disagrees with it', () => {
    expect(priceText('5,000', 9900000, 'fa')).toBe(FA.nineMillionNine)
  })

  it('respects a display with words — a range cannot be regenerated from a number', () => {
    expect(priceText('۳ تا ۳.۵ میلیون تومان', 3500000, 'fa')).toBe('۳ تا ۳.۵ میلیون تومان')
  })

  it('converts Latin digits in a worded display to Persian', () => {
    expect(priceText('3 تا 3.5 میلیون', null, 'fa')).toBe('۳ تا ۳.۵ میلیون')
  })

  it('falls back to the numeric price when the display is empty', () => {
    expect(priceText('', 9900000, 'fa')).toBe(FA.nineMillionNine)
    expect(priceText(null, 9900000, 'fa')).toBe(FA.nineMillionNine)
  })

  it('returns empty when there is neither display nor price', () => {
    expect(priceText('', null, 'fa')).toBe('')
    expect(priceText(null, 0, 'fa')).toBe('')
  })

  it('uses the typed bare number when no numeric price exists', () => {
    expect(priceText('9900000', null, 'fa')).toBe(FA.nineMillionNine)
  })
})

describe('formatEnNumber', () => {
  it('groups with commas, fixed output independent of ICU', () => {
    expect(formatEnNumber(9900000)).toBe('9,900,000')
    expect(formatEnNumber(490000)).toBe('490,000')
  })

  it('returns 0 for non-numbers', () => {
    expect(formatEnNumber(NaN)).toBe('0')
    expect(formatEnNumber(null)).toBe('0')
  })
})

describe('priceText (en)', () => {
  it('returns the display string as entered', () => {
    expect(priceText('$149', 9900000, 'en')).toBe('$149')
  })

  it('groups the numeric price when the display is empty', () => {
    expect(priceText('', 9900000, 'en')).toBe('9,900,000')
  })

  it('returns empty when there is neither', () => {
    expect(priceText('', null, 'en')).toBe('')
  })
})

describe('planPriceLine / summaryPriceLine', () => {
  it('reads the plan shape and falls back across locales', () => {
    const plan = { price: 9900000, priceDisplay: { fa: '9900000', en: '$149' } }
    expect(planPriceLine(plan, 'fa')).toBe(FA.nineMillionNine)
    expect(planPriceLine(plan, 'en')).toBe('$149')
  })

  it('survives an absent plan', () => {
    expect(planPriceLine(null, 'fa')).toBe('')
    expect(planPriceLine(undefined, 'en')).toBe('')
  })

  it('reads the priceSummary shape', () => {
    const summary = { price: 3500000, display: { fa: '۳ تا ۳.۵ میلیون', en: '$30 - $35' } }
    expect(summaryPriceLine(summary, 'fa')).toBe('۳ تا ۳.۵ میلیون')
    expect(summaryPriceLine(summary, 'en')).toBe('$30 - $35')
  })

  it('survives an absent summary', () => {
    expect(summaryPriceLine(null, 'fa')).toBe('')
  })

  it('keeps the live tavana defect fixed end to end', () => {
    // pricing.pro as it exists in KV today: display.fa holds the raw number.
    const pro = {
      price: 9900000,
      priceDisplay: { fa: '9900000', en: '$109' },
      period: { fa: 'تومان (یکبار)', en: '(one-time)' },
    }
    expect(planPriceLine(pro, 'fa')).toBe(FA.nineMillionNine)
  })
})
