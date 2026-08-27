import products from '@/data/products.json'
import {
  PLAN_KEYS,
  emptyProduct,
  normalizeProduct,
  serializeProduct,
  productWarnings,
} from '@/lib/product-shape'

/**
 * The admin panel's product form runs every edit through normalizeProduct on open
 * and serializeProduct on save. That makes these two functions the only thing
 * standing between "I fixed a typo in the panel" and a product losing its tier,
 * its screenshots or its pricing.
 *
 * The round trip over the real catalogue is the assertion that matters: it proves
 * opening a live product and pressing save gives back exactly what was there. The
 * rest cover the individual rules, each of which exists because of a specific way
 * the store renders blank.
 */

describe('normalizeProduct → serializeProduct round trip', () => {
  it.each(products.map(p => [p.slug, p]))('leaves %s byte-identical', (slug, product) => {
    expect(serializeProduct(normalizeProduct(product))).toEqual(product)
  })

  it('preserves keys the form has no field for', () => {
    // `category` is dead data nothing in src/ reads, but an edit should not be
    // how it disappears.
    const out = serializeProduct(normalizeProduct({ slug: 'x', category: 'tools' }))
    expect(out.category).toBe('tools')
  })
})

describe('normalizeProduct', () => {
  it('fills every path the form indexes into, from an empty object', () => {
    const form = normalizeProduct({})
    // These four threw on open before: `pricing: {}` is the real stored value for
    // both unreleased products.
    expect(form.pricing.starter.price).toBeNull()
    expect(form.pricing.pro.features.fa).toEqual([''])
    expect(form.priceSummary.display.fa).toBe('')
    expect(form.audience.en).toBe('')
  })

  it('falls back to a valid status and pricingMode', () => {
    const form = normalizeProduct({ slug: 'x', status: 'typo', pricingMode: 'nonsense' })
    expect(form.status).toBe('available')
    expect(form.pricingMode).toBe('fixed')
  })

  it('gives every list at least one row to type into', () => {
    const form = normalizeProduct({ slug: 'x', features: { fa: [] }, tech: [] })
    expect(form.features.fa).toEqual([''])
    expect(form.features.en).toEqual([''])
    expect(form.tech).toEqual([''])
  })

  it('returns a blank product for junk input rather than throwing', () => {
    expect(normalizeProduct(null)).toEqual(emptyProduct())
    expect(normalizeProduct('nope')).toEqual(emptyProduct())
  })
})

describe('serializeProduct', () => {
  function form(overrides) {
    return { ...emptyProduct(), slug: 'x', ...overrides }
  }

  it('drops the blank rows "+ افزودن" leaves behind', () => {
    const out = serializeProduct(form({
      features: { fa: ['یک', '', '  ', 'دو'], en: [''] },
      tech: ['Next.js', ''],
    }))
    expect(out.features.fa).toEqual(['یک', 'دو'])
    expect(out.features.en).toEqual([])
    expect(out.tech).toEqual(['Next.js'])
  })

  it('turns an empty URL into null', () => {
    // '' is close enough to a URL to pass a truthiness check somewhere and render
    // a dead anchor.
    const out = serializeProduct(form({ demoUrl: '', github: '   ' }))
    expect(out.demoUrl).toBeNull()
    expect(out.github).toBeNull()
  })

  it('keeps a plan only once it has a real price', () => {
    const out = serializeProduct(form({
      pricing: {
        starter: { ...emptyProduct().pricing.starter, price: null },
        pro: { ...emptyProduct().pricing.pro, price: 14900000 },
      },
    }))
    expect(out.pricing.starter).toBeUndefined()
    expect(out.pricing.pro.price).toBe(14900000)
  })

  it('keeps pricing an object even when no plan survives', () => {
    // api/admin/products rejects a product whose `pricing` is not an object,
    // which would make it uneditable from the panel.
    const out = serializeProduct(form({}))
    expect(out.pricing).toEqual({})
  })

  it('does not discard a coming_soon product’s pricing', () => {
    // The store shows ComingSoonPanel instead of the plan table for these, but an
    // unreleased product whose pricing is already decided should not lose it on
    // save just because the table is currently hidden.
    const out = serializeProduct(form({
      status: 'coming_soon',
      pricing: { ...emptyProduct().pricing, pro: { ...emptyProduct().pricing.pro, price: 500000 } },
    }))
    expect(out.pricing.pro.price).toBe(500000)
  })

  it('has no `free` plan to save', () => {
    // Nothing in src/components/Store reads pricing.free and PurchaseForm accepts
    // only starter and pro, so the third card collected unbuyable data.
    expect(PLAN_KEYS).toEqual(['starter', 'pro'])
    expect(Object.keys(emptyProduct().pricing)).toEqual(['starter', 'pro'])
  })

  it('always writes an alt object on a screenshot', () => {
    // ProductCard reads screenshots[0].alt[locale] without optional chaining, so
    // a screenshot with a path and no alt crashes the whole store listing.
    const out = serializeProduct(form({ screenshots: [{ src: '/images/a.webp' }] }))
    expect(out.screenshots[0]).toEqual({ src: '/images/a.webp', alt: { fa: '', en: '' } })
  })

  it('drops a screenshot with no path', () => {
    const out = serializeProduct(form({ screenshots: [{ src: '', alt: { fa: 'x', en: '' } }] }))
    expect(out.screenshots).toEqual([])
  })

  it('keeps only testimonials the store would render', () => {
    const out = serializeProduct(form({
      testimonials: [
        { name: 'رضا', quote: { fa: 'خوب بود', en: '' }, role: { fa: 'نماینده', en: '' }, rating: 5 },
        { name: '', quote: { fa: 'بی‌نام', en: '' } },
        { name: 'حسن', quote: { fa: '', en: '' } },
      ],
    }))
    expect(out.testimonials).toHaveLength(1)
    expect(out.testimonials[0].name).toBe('رضا')
  })

  it('clamps a rating into 0..5', () => {
    const out = serializeProduct(form({
      testimonials: [{ name: 'a', quote: { fa: 'q', en: '' }, rating: 99 }],
    }))
    expect(out.testimonials[0].rating).toBe(5)
  })

  it('removes priceSummary entirely when there is nothing to display', () => {
    expect(serializeProduct(form({})).priceSummary).toBeUndefined()
  })

  it('refuses to state a number in contact mode', () => {
    // The JSON-LD offer on the product page must not invent a price.
    const out = serializeProduct(form({
      pricingMode: 'contact',
      priceSummary: { price: 3000000, display: { fa: 'تماس برای قیمت', en: 'Contact' }, note: { fa: '', en: '' } },
    }))
    expect(out.priceSummary.price).toBeNull()
    expect(out.priceSummary.display.fa).toBe('تماس برای قیمت')
  })

  it('omits the optional bilingual blocks instead of storing blanks', () => {
    // The store renders an empty heading or an empty legal box for a present-but-
    // blank value; absent is the correct empty state.
    const out = serializeProduct(form({}))
    for (const key of ['valueProposition', 'legalNote', 'shortTitle', 'audience']) {
      expect(out).not.toHaveProperty(key)
    }
  })

  it('keeps an optional block once either locale has text', () => {
    const out = serializeProduct(form({ audience: { fa: 'برای یک نماینده', en: '' } }))
    expect(out.audience).toEqual({ fa: 'برای یک نماینده', en: '' })
  })

  it('coerces tier to a number or null', () => {
    expect(serializeProduct(form({ tier: '2' })).tier).toBe(2)
    expect(serializeProduct(form({ tier: null })).tier).toBeNull()
    expect(serializeProduct(form({ tier: '' })).tier).toBeNull()
  })
})

describe('productWarnings', () => {
  it('says nothing about the products already in the catalogue', () => {
    for (const product of products) {
      // Every shipped product is complete except for screenshots and testimonials
      // on the two unreleased ones, which is expected — assert on the fields that
      // make a page unusable instead.
      const warnings = productWarnings(product)
      expect(warnings.filter(w => w.includes('عنوان') || w.includes('ارزش پیشنهادی'))).toEqual([])
    }
  })

  it('flags an available product that has no plan to buy', () => {
    const out = serializeProduct({ ...emptyProduct(), slug: 'x', status: 'available' })
    expect(productWarnings(out).some(w => w.includes('هیچ پلنی قیمت ندارد'))).toBe(true)
  })

  it('does not flag missing plans when the price is by contact', () => {
    const out = serializeProduct({
      ...emptyProduct(),
      slug: 'x',
      pricingMode: 'contact',
      priceSummary: { price: null, display: { fa: 'تماس', en: 'Contact' }, note: { fa: '', en: '' } },
    })
    expect(productWarnings(out).some(w => w.includes('هیچ پلنی قیمت ندارد'))).toBe(false)
  })

  it('flags a coming_soon product with nothing in the price slot', () => {
    const out = serializeProduct({ ...emptyProduct(), slug: 'x', status: 'coming_soon' })
    expect(productWarnings(out).some(w => w.includes('پنل انتظار'))).toBe(true)
  })

  it('returns an empty list for junk rather than throwing', () => {
    expect(productWarnings(null)).toEqual([])
  })
})
