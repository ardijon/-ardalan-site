/**
 * The homepage ladder needs eight fields; the catalogue carries a hundred.
 *
 * WHY THIS EXISTS
 * ---------------
 * `src/data/products.json` is 37 KB — 23 screenshots, several thousand words of
 * copy, feature lists, testimonials. The ladder in `Products.js` renders a name,
 * an audience line, one sentence and a price. Importing the catalogue into that
 * client component would ship all of it to every visitor to render 2 KB worth of
 * summary, which is exactly why the section used to fetch `/api/products` instead
 * — and why it rendered nothing at all on the server, so «توانا» appeared nowhere
 * in the homepage HTML that Googlebot receives.
 *
 * Trimming on the server is the third option, and it costs neither: `page.js` is
 * a server component, so it reads the catalogue where the catalogue already lives
 * and only the trimmed rows cross to the client as props. Server HTML gets real
 * cards; the client bundle does not grow.
 *
 * Kept pure and dependency-free so the shape can be asserted without React.
 */

/**
 * A `{fa, en}` pair, or nothing at all.
 *
 * ProductRow falls back to `''` for a missing pair and for an empty one alike, so
 * an all-blank pair is pure payload — and payload is this module's whole purpose.
 */
function bi(value) {
  const fa = value?.fa || ''
  const en = value?.en || ''
  return fa || en ? { fa, en } : undefined
}

/** Only the two fields of a plan that the ladder shows: the price and its period. */
function plan(value) {
  const priceDisplay = bi(value?.priceDisplay)
  const period = bi(value?.period)
  if (!priceDisplay && !period) return undefined

  const out = {}
  if (priceDisplay) out.priceDisplay = priceDisplay
  if (period) out.period = period
  return out
}

export function toLadderSummary(products) {
  if (!Array.isArray(products)) return []

  return products.map(product => {
    const row = {
      slug: product.slug,
      // A product with no tier sorts last so anything added from the admin panel
      // still shows up instead of silently vanishing.
      tier: Number.isFinite(product.tier) ? product.tier : null,
      status: product.status === 'coming_soon' ? 'coming_soon' : 'available',
      featured: Boolean(product.featured),
    }

    const audience = bi(product.audience)
    if (audience) row.audience = audience

    const shortTitle = bi(product.shortTitle)
    if (shortTitle) row.shortTitle = shortTitle

    const shortDescription = bi(product.shortDescription)
    if (shortDescription) row.shortDescription = shortDescription

    // Two pricing shapes reach the ladder: `pricing.starter/pro` for anything
    // purchasable, a flat `priceSummary` for a range or "contact for pricing".
    // Both are kept because both are rendered, by different branches.
    const pricing = {}
    for (const key of ['starter', 'pro']) {
      const trimmed = plan(product.pricing?.[key])
      if (trimmed) pricing[key] = trimmed
    }
    if (Object.keys(pricing).length > 0) row.pricing = pricing

    const display = bi(product.priceSummary?.display)
    if (display) row.priceSummary = { display }

    return row
  })
}
