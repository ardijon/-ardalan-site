import fs from 'fs'
import path from 'path'
import { collectFiles } from './helpers/source-scan'

/**
 * Guard for the header's anchor navigation.
 *
 * `Header.js` lists the landing page's sections by id and links to `#<id>`. If a
 * section is renamed, removed, or — as happened when `#products` was added — its
 * component is written but never mounted, the nav item silently scrolls nowhere.
 * There is no error, no 404, and nothing in the build output: the click just does
 * nothing. This turns that into a failing test.
 *
 * Reads the id list out of the header source rather than duplicating it, so the
 * test cannot drift out of sync with the component it is guarding.
 */

const HEADER = path.join(process.cwd(), 'src', 'components', 'Header.js')
const LANDING = path.join(process.cwd(), 'src', 'app', 'page.js')

function navSectionIds() {
  const source = fs.readFileSync(HEADER, 'utf8')
  const match = source.match(/const navSections = \[([^\]]*)\]/)
  if (!match) throw new Error('navSections not found in Header.js — did it get renamed?')
  return match[1]
    .split(',')
    .map(part => part.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

const ids = navSectionIds()

// Every `id="..."` rendered anywhere under src/components or src/app.
const renderedIds = new Set(
  [
    ...collectFiles(path.join(process.cwd(), 'src', 'components')),
    ...collectFiles(path.join(process.cwd(), 'src', 'app')),
  ].flatMap(file => {
    const source = fs.readFileSync(file, 'utf8')
    return [...source.matchAll(/\bid="([^"]+)"/g)].map(m => m[1])
  })
)

describe('Header anchor navigation', () => {
  it('lists a non-empty set of sections', () => {
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(ids)('#%s is rendered by some component', (id) => {
    expect(renderedIds.has(id)).toBe(true)
  })

  it('keeps the store out of the anchor list — it is a page, not a section', () => {
    expect(ids).not.toContain('store')
  })

  it('mounts every anchored section on the landing page', () => {
    // A section can exist as a component and still never render: the landing page
    // is what decides. `#products` shipped exactly this way for one commit.
    const landing = fs.readFileSync(LANDING, 'utf8')
    const componentNames = {
      about: 'About',
      products: 'Products',
      services: 'Services',
      contact: 'Contact',
    }
    for (const id of ids) {
      const component = componentNames[id]
      if (!component) continue
      // Props allowed: the pattern is about the element being mounted, not about
      // it taking no arguments. `<Products>` receives its server-trimmed catalogue
      // as `initialProducts`, and asserting on a bare self-closing tag failed on
      // a page that was in fact rendering the section correctly.
      expect(landing).toMatch(new RegExp(`<${component}(\\s[^>]*)?\\s*/>`))
    }
  })
})
