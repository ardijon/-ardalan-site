/**
 * The shape of a product, in one place.
 *
 * WHY THIS EXISTS
 * ---------------
 * The catalogue grew a second rendering path (`coming_soon` products go through
 * ComingSoonPanel instead of PricingTable) and the admin form did not grow with
 * it. A product added from the panel arrived with no `status`, no `tier`, no
 * `audience` and no `valueProposition`, which meant it defaulted to "available",
 * rendered a plan table full of zeroes, and opened with a feature list instead of
 * saying what it was for.
 *
 * Two conversions live here, both pure so they can be tested without React:
 *
 *   normalizeProduct — storage shape → form shape. Fills in every path the form
 *     indexes into, so editing a product saved before a field existed does not
 *     throw. Unknown keys are preserved: `category` is dead data that nothing
 *     reads, but silently deleting it on the first edit is not this function's
 *     call to make.
 *
 *   serializeProduct — form shape → storage shape. Strips what the store would
 *     render as blank or broken. This is the half that matters: the store treats
 *     an empty string and a missing field very differently, and the form can only
 *     ever produce empty strings.
 */

export const PRODUCT_STATUSES = ['available', 'coming_soon']
export const PRICING_MODES = ['fixed', 'contact']

// `free` is deliberately absent. No product has ever used it, nothing in
// src/components/Store reads `pricing.free`, and PurchaseForm only accepts
// starter and pro — so the third card was a third of the pricing form collecting
// data that could not be bought.
export const PLAN_KEYS = ['starter', 'pro']

export const EMPTY_TESTIMONIAL = {
  name: '',
  role: { fa: '', en: '' },
  quote: { fa: '', en: '' },
  rating: 5,
}

export const EMPTY_SCREENSHOT = {
  src: '',
  alt: { fa: '', en: '' },
}

/**
 * Which fields the panel's translate buttons operate on, as dotted base paths —
 * `.fa` is the source and `.en` the destination, so the pair is one entry.
 *
 * A table and not a walk over emptyProduct(): plans repeat per key and screenshots
 * and testimonials repeat per row, so a generic walk would need those special cases
 * anyway. The table earns its keep the other way round — `__tests__/translate.test.js`
 * walks the shape and fails if a `{fa, en}` pair exists that is not listed here, so
 * a field added to a product cannot quietly lose its translate button.
 */
export const TRANSLATABLE_TEXTS = [
  'title',
  'shortTitle',
  'audience',
  'shortDescription',
  'description',
  'valueProposition',
  'legalNote',
  'priceSummary.display',
  'priceSummary.note',
  ...PLAN_KEYS.flatMap(plan => [
    `pricing.${plan}.priceDisplay`,
    `pricing.${plan}.period`,
    `pricing.${plan}.cta`,
  ]),
]

/** Same, for `{fa: [...], en: [...]}` pairs — translated row by row. */
export const TRANSLATABLE_LISTS = [
  'features',
  ...PLAN_KEYS.map(plan => `pricing.${plan}.features`),
]

/** Per-row pairs, relative to one entry of `screenshots` / `testimonials`. */
export const TRANSLATABLE_SCREENSHOT = ['alt']
export const TRANSLATABLE_TESTIMONIAL = ['role', 'quote']

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

/** A `{fa, en}` pair the form can always index into. */
function bi(value) {
  return { fa: value?.fa ?? '', en: value?.en ?? '' }
}

/** A list the form can always render — one empty row beats zero rows to type in. */
function rows(value) {
  return Array.isArray(value) && value.length > 0 ? [...value] : ['']
}

function biRows(value) {
  return { fa: rows(value?.fa), en: rows(value?.en) }
}

function emptyPlan() {
  return {
    // null, not 0: an empty price box should stay empty rather than reading
    // "free", and serializeProduct drops any plan that never got a real number.
    price: null,
    priceDisplay: { fa: '', en: '' },
    period: { fa: '', en: '' },
    features: { fa: [''], en: [''] },
    cta: { fa: '', en: '' },
  }
}

function normalizePlan(plan) {
  const base = emptyPlan()
  if (!plan) return base
  return {
    price: plan.price ?? null,
    priceDisplay: bi(plan.priceDisplay),
    period: bi(plan.period),
    features: biRows(plan.features),
    cta: bi(plan.cta),
  }
}

export function emptyProduct() {
  return {
    slug: '',
    status: 'available',
    featured: false,
    tier: null,
    pricingMode: 'fixed',
    releaseAt: null,
    title: { fa: '', en: '' },
    shortTitle: { fa: '', en: '' },
    audience: { fa: '', en: '' },
    shortDescription: { fa: '', en: '' },
    description: { fa: '', en: '' },
    valueProposition: { fa: '', en: '' },
    legalNote: { fa: '', en: '' },
    features: { fa: [''], en: [''] },
    tech: [''],
    pricing: { starter: emptyPlan(), pro: emptyPlan() },
    priceSummary: { price: null, display: { fa: '', en: '' }, note: { fa: '', en: '' } },
    testimonials: [],
    screenshots: [],
    demoUrl: '',
    github: '',
  }
}

export function normalizeProduct(product) {
  const base = emptyProduct()
  if (!product || typeof product !== 'object') return base

  // Spread first so keys this function does not know about survive an edit.
  const form = { ...base, ...clone(product) }

  form.status = PRODUCT_STATUSES.includes(product.status) ? product.status : 'available'
  form.pricingMode = PRICING_MODES.includes(product.pricingMode) ? product.pricingMode : 'fixed'
  form.featured = Boolean(product.featured)
  form.tier = Number.isFinite(product.tier) ? product.tier : null
  form.releaseAt = product.releaseAt || null
  form.demoUrl = product.demoUrl || ''
  form.github = product.github || ''

  form.title = bi(product.title)
  form.shortTitle = bi(product.shortTitle)
  form.audience = bi(product.audience)
  form.shortDescription = bi(product.shortDescription)
  form.description = bi(product.description)
  form.valueProposition = bi(product.valueProposition)
  form.legalNote = bi(product.legalNote)

  form.features = biRows(product.features)
  form.tech = rows(product.tech)

  // `pricing: {}` is the real stored value for both unreleased products, so
  // reaching for `pricing.starter.price` without this threw on open.
  form.pricing = {
    starter: normalizePlan(product.pricing?.starter),
    pro: normalizePlan(product.pricing?.pro),
  }

  form.priceSummary = {
    price: product.priceSummary?.price ?? null,
    display: bi(product.priceSummary?.display),
    note: bi(product.priceSummary?.note),
  }

  form.testimonials = Array.isArray(product.testimonials) ? clone(product.testimonials) : []
  form.screenshots = Array.isArray(product.screenshots) ? clone(product.screenshots) : []

  return form
}

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/** Drops the blank rows "+ افزودن" leaves behind; the store renders them as empty bullets. */
function compact(list) {
  return (Array.isArray(list) ? list : []).map(text).filter(Boolean)
}

function biOrNull(value) {
  const fa = text(value?.fa)
  const en = text(value?.en)
  return fa || en ? { fa, en } : null
}

export function serializeProduct(form) {
  const out = clone(form)

  out.slug = text(out.slug)
  out.status = PRODUCT_STATUSES.includes(out.status) ? out.status : 'available'
  out.pricingMode = PRICING_MODES.includes(out.pricingMode) ? out.pricingMode : 'fixed'
  out.featured = Boolean(out.featured)
  // A missing tier sorts last on the ladder rather than first, so null is safe.
  out.tier = Number.isFinite(Number(out.tier)) && out.tier !== null && out.tier !== '' ? Number(out.tier) : null
  out.releaseAt = out.releaseAt || null

  // '' is close enough to a URL to slip past a truthiness check somewhere and
  // produce a dead anchor; null is what the catalogue uses for "no link".
  out.demoUrl = text(out.demoUrl) || null
  out.github = text(out.github) || null

  out.features = { fa: compact(out.features?.fa), en: compact(out.features?.en) }
  out.tech = compact(out.tech)

  // Only entries the store would actually render. A row missing a name or a
  // quote does not error anywhere — it just silently disappears, which is far
  // more confusing than never having been saved.
  out.testimonials = (Array.isArray(out.testimonials) ? out.testimonials : [])
    .filter(item => text(item?.name) && (text(item?.quote?.fa) || text(item?.quote?.en)))
    .map(item => ({
      name: text(item.name),
      role: bi(item.role),
      quote: bi(item.quote),
      rating: Math.min(5, Math.max(0, Number(item.rating) || 0)),
    }))

  // `alt` is always written, even when both languages are blank: ProductCard
  // reads `screenshots[0].alt[locale]` without optional chaining, so a screenshot
  // with a path and no alt object crashes the whole store listing.
  out.screenshots = (Array.isArray(out.screenshots) ? out.screenshots : [])
    .filter(shot => text(shot?.src))
    .map(shot => ({ src: text(shot.src), alt: bi(shot.alt) }))

  // A plan with no price is not a plan: PurchaseForm needs price > 0 to compute
  // the bank-transfer amount, and PricingTable renders an empty card for anything
  // less. Plans are kept regardless of status — an unreleased product whose
  // pricing is already decided should not lose it on save just because the store
  // is currently showing the coming-soon panel instead.
  const pricing = {}
  for (const key of PLAN_KEYS) {
    const plan = out.pricing?.[key]
    if (!(Number(plan?.price) > 0)) continue
    pricing[key] = {
      price: Number(plan.price),
      priceDisplay: bi(plan.priceDisplay),
      period: bi(plan.period),
      features: { fa: compact(plan.features?.fa), en: compact(plan.features?.en) },
      cta: bi(plan.cta),
    }
  }
  // Always an object, never undefined: api/admin/products rejects a product whose
  // `pricing` is not an object, which would make it uneditable from the panel.
  out.pricing = pricing

  const summaryDisplay = biOrNull(out.priceSummary?.display)
  if (summaryDisplay) {
    out.priceSummary = {
      // 'contact' means there is no number to state, and the JSON-LD offer on the
      // product page must not invent one.
      price: out.pricingMode === 'contact' ? null : Number(out.priceSummary.price) || null,
      display: summaryDisplay,
      note: bi(out.priceSummary?.note),
    }
  } else {
    delete out.priceSummary
  }

  // These three read as "" on the store when present but blank, which renders an
  // empty heading or an empty legal box. Absent is the correct empty state.
  for (const key of ['valueProposition', 'legalNote', 'shortTitle', 'audience']) {
    const value = biOrNull(out[key])
    if (value) out[key] = value
    else delete out[key]
  }

  return out
}

/**
 * What the store will render as an empty space, in Persian.
 *
 * Takes a serialized product, so a missing key genuinely means nothing was
 * entered. None of these block a save — every one of them is valid data that
 * produces a page with a hole in it, and a hole found by a visitor costs more
 * than a list found before saving. The messages name the consequence rather than
 * the field, because "audience is empty" does not tell you that the ladder row
 * loses its "for whom" line.
 */
export function productWarnings(product) {
  const out = []
  if (!product || typeof product !== 'object') return out

  const comingSoon = product.status === 'coming_soon'
  const byContact = product.pricingMode === 'contact'
  const hasPlans = Object.keys(product.pricing || {}).length > 0
  const hasSummary = Boolean(product.priceSummary?.display?.fa || product.priceSummary?.display?.en)

  if (!product.title?.fa) out.push('عنوان فارسی خالی است — کارت محصول و تیتر صفحه بی‌نام می‌مانند.')
  if (!product.shortDescription?.fa) out.push('توضیح کوتاه فارسی خالی است — بدنه‌ی کارت و توضیحات گوگل خالی می‌شود.')
  if (!product.valueProposition) out.push('ارزش پیشنهادی خالی است — صفحه با فهرست ویژگی‌ها باز می‌شود، نه با اینکه چه مشکلی را حل می‌کند.')
  if (!product.shortTitle) out.push('عنوان کوتاه خالی است — کارت محصول عنوان کامل را نمایش می‌دهد که ممکن است جا نشود.')
  if (!product.audience) out.push('مخاطب خالی است — خط «برای چه کسی» در نردبان فروشگاه نمایش داده نمی‌شود.')
  if (product.tier === null) out.push('سطح نردبان خالی است — محصول آخر فهرست فروشگاه می‌رود.')
  if (!product.features?.fa?.length) out.push('فهرست ویژگی‌ها (فارسی) خالی است — بخش ویژگی‌های صفحه‌ی محصول نمایش داده نمی‌شود.')
  if (!product.screenshots?.length) out.push('اسکرین‌شاتی ثبت نشده — گالری نمایش داده نمی‌شود و کارت محصول تصویری ندارد.')

  // The only combination that leaves the page with no way to pay and no
  // explanation of why: available, priced, and no plan ever got a number.
  if (!comingSoon && !byContact && !hasPlans) {
    out.push('محصول «موجود» است ولی هیچ پلنی قیمت ندارد — جدول قیمت خالی نمایش داده می‌شود و چیزی قابل خرید نیست.')
  }
  if (byContact && !hasSummary) {
    out.push('در حالت «تماس برای قیمت»، متن «نمایش قیمت» جای عدد را می‌گیرد — خالی بماند، آن قسمت خالی می‌ماند.')
  }
  if (comingSoon && !hasSummary) {
    out.push('برای محصول «به‌زودی»، «نمایش قیمت» تنها چیزی است که در پنل انتظار دیده می‌شود.')
  }
  if (comingSoon && !product.releaseAt) {
    out.push('تاریخ انتشار خالی است — شمارش معکوس نمایش داده نمی‌شود (اگر تاریخ قطعی نداری، همین درست است).')
  }

  return out
}
