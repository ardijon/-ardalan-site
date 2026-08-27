import dictionary from '@/lib/i18n/dictionary'
import products from '@/data/products.json'

/**
 * Guards the landing → store hand-off.
 *
 * The portfolio used to map a *translated project title* to a store URL, so the
 * only in-body link from the landing page to a product pointed at a slug that
 * had been renamed — every visitor who clicked it got a 404. The link now comes
 * from `storeSlug` on the dictionary entry, and these tests fail loudly if that
 * slug ever drifts away from the catalogue again.
 */

const slugs = products.map(p => p.slug)
const locales = Object.keys(dictionary)

describe('portfolio → store links', () => {
  it.each(locales)('every storeSlug in %s resolves to a real product', (locale) => {
    const projects = dictionary[locale].portfolio.projects
    const linked = projects.filter(p => p.storeSlug)

    for (const project of linked) {
      expect(slugs).toContain(project.storeSlug)
    }
  })

  it('at least one project links into the store', () => {
    // Without this the landing page has no body-level path to a purchase.
    const linked = dictionary.fa.portfolio.projects.filter(p => p.storeSlug)
    expect(linked.length).toBeGreaterThan(0)
  })

  it('fa and en portfolios agree on which projects are purchasable', () => {
    // Same index = same project across locales; a mismatch means one language
    // shows a buy button and the other silently does not.
    const fa = dictionary.fa.portfolio.projects.map(p => p.storeSlug || null)
    const en = dictionary.en.portfolio.projects.map(p => p.storeSlug || null)
    expect(fa).toEqual(en)
  })
})
