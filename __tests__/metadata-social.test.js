import fs from 'fs'
import path from 'path'
import { codeLines, collectFiles, asRows } from './helpers/source-scan'
import { OG_IMAGE_STORE } from '@/lib/constants'

/**
 * Every page must own its canonical URL and its link-preview card.
 *
 * Next inherits `alternates`, `openGraph` and `twitter` from the root layout only
 * while a child omits them, and *replaces* — never merges — the ones a child does
 * define. Three separate bugs came out of that one rule:
 *
 *   - `/store/track` declared only a title and description, so it inherited
 *     `canonical: SITE_URL` and told every crawler it was a duplicate of the
 *     homepage. A canonical is a directive, not a hint.
 *   - `/store` defined `openGraph` without `images`, which replaced the root's
 *     block and left the page with no `og:image` at all, and defined no `twitter`
 *     block, so its card on X carried the personal bio instead of the store.
 *   - `/store/agent-site` and `/store/rahyar` passed `images: []` because neither
 *     has screenshots yet, and an empty list means no image on any network.
 *
 * All three are invisible from a browser: the pages render correctly, no test goes
 * red, and the only way to see the damage is to read the served `<head>` or share
 * a link and look at the card. That is what makes them worth a guard.
 */

const APP_DIR = path.join(process.cwd(), 'src/app')

/** Source with comments blanked, so an explanation cannot satisfy a check. */
function stripped(file) {
  return codeLines(fs.readFileSync(file, 'utf8'))
    .map(([, code]) => code)
    .join('\n')
}

/**
 * The `key: { ... }` object literal from `source`, brace-matched.
 *
 * Regex cannot do this — `openGraph` contains nested objects for `images`. Returns
 * null when the key is absent, which is how the callers tell "not defined" from
 * "defined but incomplete".
 */
function objectLiteral(source, key) {
  const start = source.indexOf(`${key}: {`)
  if (start === -1) return null

  let depth = 0
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1)
  }
  return null
}

const pages = collectFiles(APP_DIR).filter(file =>
  /export (const metadata|async function generateMetadata)/.test(stripped(file))
)

describe('page metadata', () => {
  it('finds the pages that declare metadata', () => {
    // A rename or a moved route should not quietly empty this suite — every check
    // below is `it.each` over `pages`, and an empty list passes all of them.
    expect(pages.length).toBeGreaterThanOrEqual(5)
  })

  it.each(asRows(pages))('%s declares its own canonical URL', (_display, file) => {
    // Inheriting a canonical is never right: the parent's points at the parent.
    expect(stripped(file)).toMatch(/canonical:/)
  })

  it.each(asRows(pages))('%s ships an image with its openGraph block', (_display, file) => {
    const openGraph = objectLiteral(stripped(file), 'openGraph')
    if (!openGraph) return // Inheriting the whole block is fine; half of it is not.

    expect(openGraph).toMatch(/images:/)
    // `images: []` is worse than no block at all — it overrides the parent with
    // nothing, so the card renders imageless on every network.
    expect(openGraph).not.toMatch(/images:\s*\[\s*\]/)
  })

  it.each(asRows(pages))('%s pairs its openGraph block with a twitter block', (_display, file) => {
    const source = stripped(file)
    if (!objectLiteral(source, 'openGraph')) return

    // Without this pairing the page describes itself to Facebook and Telegram
    // while X keeps serving whatever the root layout says — two different stories
    // from one URL.
    expect(objectLiteral(source, 'twitter')).not.toBeNull()
  })
})

describe('store link-preview card', () => {
  it('points at a file that exists', () => {
    // A dead image URL fails silently: the crawler simply renders no card.
    const target = path.join(process.cwd(), 'public', OG_IMAGE_STORE.url)
    expect(fs.existsSync(target)).toBe(true)
  })

  it('carries the dimensions the large-card layouts expect', () => {
    expect([OG_IMAGE_STORE.width, OG_IMAGE_STORE.height]).toEqual([1200, 630])
  })

  it('is a format WhatsApp will render', () => {
    // The source screenshots are WebP and WhatsApp does not preview it, which is
    // why `scripts/make-og-image.js` re-encodes to JPEG.
    expect(OG_IMAGE_STORE.url).toMatch(/\.jpe?g$/)
  })
})

describe('social copy', () => {
  const rootTwitter = objectLiteral(stripped(path.join(APP_DIR, 'layout.js')), 'twitter')

  it('reads the root layout block it compares against', () => {
    expect(rootTwitter).not.toBeNull()
  })

  const storePages = pages.filter(f => f.includes(`${path.sep}store${path.sep}`))

  it.each(asRows(storePages))('%s does not repeat the personal bio', (_display, file) => {
    const twitter = objectLiteral(stripped(file), 'twitter')
    if (!twitter) return

    // The homepage description lists four job titles. On a store page it is not
    // just off-brand, it is the wrong page's copy — this is the exact string that
    // `/store` was serving in production before the fix.
    const bio = rootTwitter.match(/description:\s*'([^']+)'/)?.[1]
    expect(bio).toBeTruthy()
    expect(twitter).not.toContain(bio)
  })
})
