import fs from 'fs'
import path from 'path'
import { collectFiles, offendingLines } from './helpers/source-scan'

/**
 * The visitor counter was removed, not repaired.
 *
 * It rendered a number in the footer and counted by writing
 * `.freebuff/visitor-count.json` with `node:fs`, deduping on a module-level `Map`.
 * Both are no-ops on Workers — the write is swallowed and the `Map` belongs to one
 * isolate — so the figure on the live site was never the real one. Since nothing
 * read it and no decision rested on it, deleting was the honest fix.
 *
 * This guard exists because the pieces were spread across five places (a component,
 * a route, a standalone worker, an env var, and a dictionary key) and a later
 * re-import of any one of them would resurrect a counter that cannot count.
 *
 * It survives the arrival of the product visit counter (lib/visit-stats.js, tested
 * in visit-tracking.test.js) on purpose. That one is the storage-layer version this
 * docblock asked for, but it answers a different question: it writes through
 * lib/storage.js, it is bounded by a daily write budget, and it reports into the
 * admin panel rather than onto the public footer. The public footer number is still
 * unwanted — the owner asked for it to be taken off the homepage — so these names
 * stay banned.
 */

const ROOT = process.cwd()
const src = p => path.join(ROOT, p)

describe('the removed visitor counter stays removed', () => {
  it.each([
    ['the API route', 'src/app/api/visitors'],
    ['the component', 'src/components/VisitorCounter.js'],
    ['the standalone counter worker', 'worker'],
  ])('has no %s', (_label, relative) => {
    expect(fs.existsSync(src(relative))).toBe(false)
  })

  it('is not referenced anywhere in src', () => {
    // Comments are excluded by codeLines, so the explanation above and the note in
    // Footer.js do not trip this — only a live import or fetch would.
    const offenders = []
    for (const file of collectFiles(src('src'))) {
      const source = fs.readFileSync(file, 'utf8')
      const hits = offendingLines(source, /VisitorCounter|api\/visitors|NEXT_PUBLIC_COUNTER_URL/)
      if (hits.length) offenders.push(`${path.relative(ROOT, file)} — ${hits.join(', ')}`)
    }
    expect(offenders).toEqual([])
  })

  it('leaves no orphan translation key', () => {
    // A key nothing reads is how the next person concludes the feature still exists
    // and goes looking for the component that renders it.
    const dictionary = fs.readFileSync(src('src/lib/i18n/dictionary.js'), 'utf8')
    expect(offendingLines(dictionary, /^\s*visitor:\s*\{/)).toEqual([])
  })

  it('keeps AnimatedCounter, which the About section still uses', () => {
    // The counter was the component's second caller, so deleting it was the moment
    // AnimatedCounter could plausibly have been swept away with it.
    expect(fs.existsSync(src('src/components/AnimatedCounter.js'))).toBe(true)
    expect(fs.readFileSync(src('src/components/About.js'), 'utf8')).toContain('AnimatedCounter')
  })
})
