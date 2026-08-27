import fs from 'fs'
import path from 'path'
import { codeLines, offendingLines } from './helpers/source-scan'

/**
 * The page never scrolls sideways.
 *
 * A landscape phone reported product images "overlapping everything and becoming
 * unreadable, but only in Persian". Persian was a red herring: the page overflowed
 * its viewport by 1694px in both directions, because the gallery's thumbnail strip
 * is a nowrap flex row whose min-content width is 2464px and `overflow-x: auto`
 * makes a box scrollable without making it shrinkable. The grid item holding it had
 * `min-width: auto`, adopted that 2464px as its own minimum, and the page followed.
 *
 * What differed by direction was only the symptom. In LTR the extra width trails off
 * to the right, past where anyone looks. In RTL the document's scroll origin is the
 * right edge, so the same box extends leftward *across* the layout — the overflow
 * lands on top of the content rather than behind the reader.
 *
 * So these tests hold two things: the containers that must permit shrinking, and the
 * document-level net for whatever slips past them.
 */

const read = p => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

describe('horizontal overflow', () => {
  it('should clip page-level overflow with clip, never hidden', () => {
    const css = read('src/app/globals.css')

    expect(css).toMatch(/html,\s*\n?\s*body\s*\{[^}]*overflow-x:\s*clip/)

    // `hidden` would make the element a scroll container, which silently disables
    // every position: sticky on the page — the product pricing panel is sticky.
    expect(offendingLines(css, /overflow-x:\s*hidden/)).toEqual([])
  })

  it('should give every product grid column min-w-0', () => {
    // The grid item is where min-width:auto turns a wide descendant into a wide page.
    const source = read('src/components/Store/ProductClient.js')
    const columns = codeLines(source).filter(([, code]) => /lg:col-span-\d/.test(code))

    expect(columns.length).toBeGreaterThan(0)
    for (const [lineNo, code] of columns) {
      expect(`${lineNo}: ${code.trim()}`).toMatch(/min-w-0/)
    }
  })

  it('should pair every flex-1 scroll container with min-w-0', () => {
    // flex-1 leaves min-width at auto, so the item refuses to shrink below its own
    // content's min-content width and pushes its siblings out of the container.
    const source = read('src/components/Store/ScreenshotGallery.js')
    const offenders = codeLines(source)
      .filter(([, code]) => /flex-1/.test(code) && /overflow-x-auto/.test(code) && !/min-w-0/.test(code))
      .map(([lineNo, code]) => `${lineNo}: ${code.trim()}`)

    expect(offenders).toEqual([])
  })

  it('should cap the gallery image against the viewport height', () => {
    // Without this, rotating a phone to see a screenshot bigger showed less of it:
    // w-full h-auto makes a 3:2 image 505px tall in a 375px-tall window.
    const source = read('src/components/Store/ScreenshotGallery.js')
    expect(source).toMatch(/max-h-\[\d+svh\]/)
  })

  it('should define the short breakpoint the lightbox relies on', () => {
    // `short:` is a height query, so it cannot be inferred from the width scale. If it
    // is ever dropped from the config, Tailwind emits nothing and the landscape
    // lightbox silently goes back to spending its height on padding.
    const config = read('tailwind.config.js')
    expect(config).toMatch(/short:\s*\{\s*raw:\s*'\(max-height:\s*\d+px\)'\s*\}/)

    const gallery = read('src/components/Store/ScreenshotGallery.js')
    expect(gallery).toMatch(/short:p-2/)
  })
})
