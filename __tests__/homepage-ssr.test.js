import fs from 'fs'
import path from 'path'
import { offendingLines } from './helpers/source-scan'
import { toLadderSummary } from '@/lib/product-summary'
import products from '@/data/products.json'

/**
 * The homepage must keep server-rendering its content.
 *
 * Every section below the hero — About, Products, Services, Contact, Footer —
 * is loaded through `next/dynamic`. That is fine on its own: code splitting is
 * worth having. What was not fine is `ssr: false`, which was set on all of them
 * and kept every word of the page out of the server HTML. The response was the
 * hero plus empty skeleton divs, so Googlebot and every link-preview bot that
 * does not execute JavaScript saw an empty page.
 *
 * `ssr: false` reads like a harmless performance flag, which is exactly why it
 * needs a guard: nothing fails, no test goes red, the page still looks correct
 * in a browser, and the cost is invisible until someone checks the raw HTML.
 *
 * Removing it is safe here and the reasons are worth keeping written down: none
 * of these touch `window`/`document`/storage at module or render time, and
 * I18nProvider starts at `useState('fa')` and only reads localStorage inside an
 * effect — so the server render and the client's first render agree.
 */

const PAGE = path.join(process.cwd(), 'src/app/page.js')
const PRODUCTS = path.join(process.cwd(), 'src/components/Products.js')
const ABOUT = path.join(process.cwd(), 'src/components/About.js')

describe('homepage server rendering', () => {
  const source = fs.readFileSync(PAGE, 'utf8')

  it('does not disable SSR on any dynamic import', () => {
    // codeLines strips comments, so the explanation above page.js's imports —
    // which names `ssr: false` on purpose — does not trip this.
    expect(offendingLines(source, /ssr:\s*false/)).toEqual([])
  })

  it('still code-splits the below-fold sections', () => {
    // The fix was to drop one option, not to drop `dynamic()`. If a later change
    // converts these to static imports, that is a different trade-off and this
    // test should be revisited deliberately rather than deleted in passing.
    const sections = ['About', 'Products', 'Services', 'Contact', 'Footer']
    const missing = sections.filter(
      name => !new RegExp(`const ${name} = dynamic\\(`).test(source)
    )
    expect(missing).toEqual([])
  })

  it('stays a server component', () => {
    // `"use client"` here was only ever there because `ssr: false` requires it.
    // Putting it back would make Home() unable to read the catalogue, and the
    // product rows would silently go back to being client-only.
    expect(offendingLines(source, /['"]use client['"]/)).toEqual([])
  })

  it('feeds the product ladder from the server', () => {
    expect(source).toMatch(/toLadderSummary\(getAllProducts\(\)\)/)
    expect(source).toMatch(/<Products initialProducts=\{ladder\} \/>/)
  })
})

describe('product ladder data', () => {
  const source = fs.readFileSync(PRODUCTS, 'utf8')

  it('seeds its state from the prop instead of null', () => {
    // `useState(null)` renders the skeleton branch, which is what put three empty
    // grey boxes in the server HTML where the product names belong.
    expect(source).toMatch(/useState\(initialProducts \?\? null\)/)
  })

  it('cannot let a failed refresh erase server-rendered rows', () => {
    // The rows exist before the fetch now, so `setProducts([])` on a bad response
    // would delete real cards from a page that was already correct.
    expect(offendingLines(source, /setProducts\(\[\]\)/)).toEqual([])
  })

  it('carries every field the ladder renders', () => {
    // The point of trimming is to send less, so the risk is sending too little —
    // a dropped field shows up as a blank line on the card, never as an error.
    const [tavana] = toLadderSummary(products).filter(p => p.slug === 'tavana')

    expect(tavana.shortTitle.fa).toBeTruthy()
    expect(tavana.shortDescription.fa).toBeTruthy()
    expect(tavana.audience.fa).toBeTruthy()
    expect(tavana.tier).toBe(2)
    expect(tavana.pricing.starter.priceDisplay.fa).toBeTruthy()
    expect(tavana.pricing.starter.period.fa).toBeTruthy()
  })

  it('keeps the flat price summary for products with no plans', () => {
    // رهیار is «تماس برای قیمت» — it has no `pricing`, and the card reads
    // `priceSummary.display` instead. Dropping that key blanks its price.
    const [rahyar] = toLadderSummary(products).filter(p => p.slug === 'rahyar')

    expect(rahyar.priceSummary.display.fa).toBeTruthy()
    expect(rahyar.pricing).toBeUndefined()
  })

  it('leaves the screenshots behind', () => {
    // The whole reason to trim: 23 screenshots and several thousand words of copy
    // would otherwise cross into the client bundle to render a one-line summary.
    const summary = toLadderSummary(products)
    const serialized = JSON.stringify(summary)

    expect(serialized).not.toMatch(/screenshots|testimonials|features|\.webp/)
    expect(serialized.length).toBeLessThan(4000)
  })
})

describe('about section heading', () => {
  const source = fs.readFileSync(ABOUT, 'utf8')

  it('renders the title as real text, not a typewriter', () => {
    // The typewriter kept the <h2> empty until an IntersectionObserver fired —
    // which never happens on the server — and held the visible title hostage to
    // a 100ms interval. The heading is plain text now, so the title ships in the
    // HTML and no interval is left behind.
    expect(source).toMatch(/\{titleText\}/)
    expect(offendingLines(source, /setInterval/)).toEqual([])
  })
})
