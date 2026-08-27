import fs from 'fs'
import path from 'path'
import { collectFiles, codeLines, asRows } from './helpers/source-scan'
import { ADMIN_TABS } from '@/components/Admin/AdminShell'

/**
 * Guards for the admin panel's shell.
 *
 * Two failures here are both silent — nothing in the build output, no error in the
 * console, just a panel that behaves wrongly:
 *
 * 1. A tab in the rail with no branch on the page renders an empty content area.
 *    Clicking it looks like a broken app.
 * 2. A component defined inside another component is a new type on every render,
 *    so React unmounts and remounts it. In this panel that means the search box
 *    loses focus after one character — the bug the product form already hit once.
 */

const ADMIN_DIR = path.join(process.cwd(), 'src', 'components', 'Admin')
const PAGE = path.join(process.cwd(), 'src', 'app', 'admin', 'page.js')
const SHELL = path.join(ADMIN_DIR, 'AdminShell.js')

const page = fs.readFileSync(PAGE, 'utf8')

describe('admin tabs', () => {
  it('exports a unique, non-empty tab list', () => {
    expect(ADMIN_TABS.length).toBeGreaterThan(0)
    const keys = ADMIN_TABS.map(t => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it.each(ADMIN_TABS.map(t => t.key))('the page renders something for %s', (key) => {
    expect(page).toContain(`activeTab === '${key}'`)
  })

  it('opens on a tab that exists', () => {
    const initial = page.match(/setActiveTab\] = useState\('(\w+)'\)/)?.[1]
    expect(ADMIN_TABS.map(t => t.key)).toContain(initial)
  })

  it('gives every tab a label and an icon', () => {
    for (const tab of ADMIN_TABS) {
      expect(typeof tab.label).toBe('string')
      expect(tab.label.length).toBeGreaterThan(0)
      expect(typeof tab.icon).toBe('string')
    }
  })

  it('drops the site chrome from the panel', () => {
    // Header and Footer stay imported for the login and loading screens, but the
    // authed branch must not mount them: they were most of the 300px of height
    // the redesign reclaimed, and AdminShell replaces them.
    expect(page).toContain('<AdminShell')
    const authedBranch = page.slice(page.indexOf('<AdminShell'))
    expect(authedBranch).not.toContain('<Header')
    expect(authedBranch).not.toContain('<Footer')
  })
})

/**
 * A component declared inside another one. Matches an indented `function Name(`
 * with a capitalised name — top-level declarations start at column zero, so the
 * leading whitespace is what distinguishes the two.
 */
const NESTED_COMPONENT = /^\s+function\s+[A-Z]\w*\s*\(/

describe('admin components stay at module scope', () => {
  it.each(asRows(collectFiles(ADMIN_DIR)))('%s', (_display, file) => {
    const offenders = codeLines(fs.readFileSync(file, 'utf8'))
      .filter(([, code]) => NESTED_COMPONENT.test(code))
      .map(([lineNo, code]) => `${lineNo}: ${code.trim()}`)

    expect(offenders).toEqual([])
  })
})

/**
 * The rail has to sit on the right, where a Persian reader's eye starts.
 *
 * Nothing in the CSS says which side that is: the shell is a `dir="rtl"` flex row,
 * so side is decided by DOM order — the first child takes the right edge. It
 * shipped on the left exactly once, because the source reads top-to-bottom as
 * "content, then nav" and that looks like it should mean "content on the left".
 */
describe('rail side', () => {
  const shell = fs.readFileSync(SHELL, 'utf8')

  it('keeps the shell right-to-left regardless of the site locale', () => {
    expect(shell).toMatch(/dir="rtl"/)
  })

  it('puts the nav before the content, so rtl places it on the right', () => {
    const nav = shell.indexOf('hidden lg:flex flex-col shrink-0')
    const content = shell.indexOf('flex-1 flex flex-col min-w-0')
    expect(nav).toBeGreaterThan(-1)
    expect(content).toBeGreaterThan(-1)
    expect(nav).toBeLessThan(content)
  })

  it('opens the mobile drawer on the same side as its own button', () => {
    // The hamburger is at the start of the header — the right, in rtl. A drawer
    // ordered after the backdrop would slide in from the far left instead.
    const drawer = shell.indexOf('w-56 flex flex-col gap-1 p-2')
    const backdrop = shell.indexOf('flex-1 bg-black/40')
    expect(drawer).toBeGreaterThan(-1)
    expect(drawer).toBeLessThan(backdrop)
  })
})

/**
 * Order status wording lives in exactly one file.
 *
 * Three tabs now render an order status. When each kept its own copy of the map,
 * nothing stopped one from drifting — and a panel that calls the same stored status
 * "تایید شده" on one tab and something else on another is lying about which of the
 * two the system actually holds.
 */
describe('order status labels are not duplicated', () => {
  const OWNER = path.join(ADMIN_DIR, 'shared.js')

  it.each(asRows(collectFiles(ADMIN_DIR).filter(f => f !== OWNER)))('%s', (_display, file) => {
    const source = fs.readFileSync(file, 'utf8')
    expect(source).not.toMatch(/const STATUS_LABELS\s*=/)
    expect(source).not.toMatch(/const STATUS_COLORS\s*=/)
  })
})
