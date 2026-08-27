import fs from 'fs'
import path from 'path'
import { collectFiles, offendingLines, asRows } from './helpers/source-scan'

/**
 * Guards every dynamic route against synchronous `params` access.
 *
 * Next 16 made `params` a promise. The compatibility shim only *warns* on
 * synchronous access — `makeUntrackedParams` hands back a plain
 * `Promise.resolve(...)`, so a property read yields `undefined`, not the segment.
 * That failure is silent in the worst possible way: `/blog/[slug]` looked fine in
 * the editor while every article on the site rendered as 404, and `/store/[slug]`
 * published `canonical: /store/undefined` to Google.
 *
 * A regex over the dynamic-route files is cheap and closes the whole class of
 * bug, including in routes nobody has written yet.
 */

const APP_DIR = path.join(process.cwd(), 'src', 'app')

const files = collectFiles(APP_DIR, { onlyUnderBrackets: true })

describe('dynamic routes await their params', () => {
  it('finds dynamic route files to check', () => {
    // Without this the suite would pass vacuously if the recursion ever broke.
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(asRows(files))('%s never reads a property off `params` synchronously', (_relative, full) => {
    expect(offendingLines(fs.readFileSync(full, 'utf8'), /\bparams\.\w/)).toEqual([])
  })

  it.each(asRows(files))('%s awaits params wherever it destructures them', (_relative, full) => {
    // `const { slug } = params` is the same bug wearing a destructure.
    expect(offendingLines(fs.readFileSync(full, 'utf8'), /=\s*params\s*;?\s*$/)).toEqual([])
  })
})
