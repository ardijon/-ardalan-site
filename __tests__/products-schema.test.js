import products from '@/data/products.json'

/**
 * Schema guard for the product catalogue.
 *
 * The catalogue is hand-edited JSON and now feeds two different rendering paths —
 * a purchasable product goes through PricingTable/PurchaseForm, an unreleased one
 * through ComingSoonPanel. Each path needs different fields, and a missing one
 * fails quietly: a blank price card, an anchor with href="undefined", a plan
 * table with empty rows. These assertions turn all of that into a failing test.
 */

const VALID_STATUS = ['available', 'coming_soon']
const VALID_PRICING_MODE = ['fixed', 'contact']
const LOCALES = ['fa', 'en']

function bilingual(field, name) {
  expect(field).toBeDefined()
  for (const locale of LOCALES) {
    expect(typeof field[locale]).toBe('string')
    expect(field[locale].trim().length).toBeGreaterThan(0)
  }
  // Keeps the assertion message useful when it fails on one of three products.
  expect(name).toBeTruthy()
}

describe('Product catalogue schema', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(products)).toBe(true)
    expect(products.length).toBeGreaterThan(0)
  })

  it('has unique slugs safe for URLs', () => {
    const slugs = products.map(p => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('has a unique tier per product so the ladder order is deterministic', () => {
    const tiers = products.map(p => p.tier)
    for (const tier of tiers) {
      expect(Number.isInteger(tier)).toBe(true)
    }
    expect(new Set(tiers).size).toBe(tiers.length)
  })

  describe.each(products.map(p => [p.slug, p]))('%s', (slug, product) => {
    it('has a valid status and pricingMode', () => {
      expect(VALID_STATUS).toContain(product.status)
      expect(VALID_PRICING_MODE).toContain(product.pricingMode)
    })

    it('has bilingual copy in every field the store renders', () => {
      bilingual(product.title, `${slug}.title`)
      bilingual(product.shortTitle, `${slug}.shortTitle`)
      bilingual(product.shortDescription, `${slug}.shortDescription`)
      bilingual(product.description, `${slug}.description`)
      bilingual(product.audience, `${slug}.audience`)
    })

    it('states what problem it solves', () => {
      // ProductDetail opens with this. Without it the page starts at a feature
      // list and a visitor never learns what the product is for — which is how
      // the two upcoming products first went live.
      bilingual(product.valueProposition, `${slug}.valueProposition`)
    })

    it('has features in both locales', () => {
      for (const locale of LOCALES) {
        expect(Array.isArray(product.features?.[locale])).toBe(true)
        expect(product.features[locale].length).toBeGreaterThan(0)
      }
    })

    it('keeps pricing an object even when empty', () => {
      // api/admin/products/route.js:49 rejects a product whose `pricing` is not
      // an object, so dropping the empty object would make the product
      // uneditable from the panel.
      expect(typeof product.pricing).toBe('object')
      expect(product.pricing).not.toBeNull()
    })

    it('has arrays, not undefined, for the optional collections', () => {
      expect(Array.isArray(product.tech)).toBe(true)
      expect(Array.isArray(product.screenshots)).toBe(true)
      expect(Array.isArray(product.testimonials)).toBe(true)
    })

    it('has complete testimonials or none at all', () => {
      // Testimonials renders only entries carrying both a name and a quote, so a
      // half-filled row from the admin panel disappears without any error. An
      // empty array is fine; an incomplete entry is not.
      for (const item of product.testimonials) {
        expect(typeof item.name).toBe('string')
        expect(item.name.trim().length).toBeGreaterThan(0)

        const quote = item.quote?.fa || item.quote?.en || ''
        expect(quote.trim().length).toBeGreaterThan(0)

        if (item.rating !== undefined) {
          expect(item.rating).toBeGreaterThanOrEqual(0)
          expect(item.rating).toBeLessThanOrEqual(5)
        }
      }
    })

    it('has an absolute demoUrl or none at all', () => {
      // ProductCard renders the demo link conditionally; an empty string would
      // pass that check and produce a dead anchor.
      if (product.demoUrl !== null) {
        expect(product.demoUrl).toMatch(/^https?:\/\//)
      }
    })

    it('has releaseAt either null or a parseable date', () => {
      if (product.releaseAt !== null) {
        expect(Number.isFinite(new Date(product.releaseAt).getTime())).toBe(true)
      }
    })

    if (product.status === 'available') {
      it('is actually purchasable: PurchaseForm needs a starter or pro plan', () => {
        const plans = product.pricing || {}
        expect(Boolean(plans.starter || plans.pro)).toBe(true)

        for (const plan of [plans.starter, plans.pro].filter(Boolean)) {
          expect(typeof plan.price).toBe('number')
          expect(plan.price).toBeGreaterThan(0)
          bilingual(plan.priceDisplay, `${slug}.pricing.priceDisplay`)
        }
      })
    }

    if (product.status === 'coming_soon') {
      it('shows something in place of a price', () => {
        // ComingSoonPanel renders priceSummary.display; without it the card is
        // an empty box next to a "coming soon" badge.
        bilingual(product.priceSummary?.display, `${slug}.priceSummary.display`)
      })

      it('renders fine with no release date — the countdown just stays hidden', () => {
        expect(product.releaseAt === null || typeof product.releaseAt === 'string').toBe(true)
      })

      if (product.pricingMode === 'contact') {
        it('needs no numeric price', () => {
          expect(product.priceSummary.price).toBeNull()
        })
      }

      if (product.pricingMode === 'fixed') {
        it('states a number for the JSON-LD offer', () => {
          expect(typeof product.priceSummary.price).toBe('number')
          expect(product.priceSummary.price).toBeGreaterThan(0)
        })
      }
    }
  })
})
