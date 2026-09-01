import fs from 'fs'
import path from 'path'
import { codeLines, offendingLines } from './helpers/source-scan'

/**
 * Guards on the parts of the visit counter that cannot be unit-tested.
 *
 * The arithmetic is covered by behaviour in visit-stats.test.js. What is left is
 * structural, and every item here is something whose removal would be silent:
 * an unauthenticated write route losing a guard costs KV quota (and with it the
 * ability to take an order), a tracker losing its dedupe multiplies every count,
 * and a beacon in the wrong place collects nothing at all while looking installed.
 */

const ROOT = process.cwd()
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8')

const TRACK_ROUTE = 'src/app/api/track/route.js'
const ADMIN_ROUTE = 'src/app/api/admin/visits/route.js'
const TRACKER = 'src/components/Store/VisitTracker.js'
const ANALYTICS = 'src/components/Analytics.js'
const LAYOUT = 'src/app/layout.js'

describe('the public /api/track route', () => {
  const source = read(TRACK_ROUTE)

  it('is the only unauthenticated route that writes visit stats', () => {
    expect(source).toMatch(/export async function POST/)
    expect(source).not.toMatch(/export async function GET/)
  })

  it('rejects a cross-origin post', () => {
    expect(source).toMatch(/checkCsrf/)
  })

  it('validates the event against the shared list rather than its own copy', () => {
    expect(source).toMatch(/TRACKED_EVENTS/)
    expect(source).toMatch(/TRACKED_EVENTS\.includes\(event\)/)
  })

  it('accepts only a slug that exists in the live catalogue', () => {
    // Without this an attacker chooses the keys, and the stored document grows
    // without bound however tight the write budget is.
    expect(source).toMatch(/getLiveProducts/)
    expect(source).toMatch(/products\.some\(p => p\.slug === slug\)/)
  })

  it('throttles per client address', () => {
    expect(source).toMatch(/extractClientKey/)
  })

  it('keeps its rate-limit state per isolate, never in storage', () => {
    // Persisting the throttle would cost a KV write per request, which is the
    // exact resource the throttle is protecting.
    expect(offendingLines(source, /putDoc|writeCollection|mutateCollection/)).toEqual([])
  })

  it('is never cached', () => {
    expect(source).toMatch(/'Cache-Control': 'no-store'/)
  })
})

describe('the admin read route', () => {
  const source = read(ADMIN_ROUTE)

  it('is behind the session guard', () => {
    expect(source).toMatch(/guardAdminRoute/)
  })

  it('caps the window so one dashboard load cannot ask for unbounded reads', () => {
    expect(source).toMatch(/MAX_DAYS\s*=\s*\d+/)
    expect(source).toMatch(/Math\.min\(/)
  })

  it('performs no writes', () => {
    expect(offendingLines(source, /putDoc|recordVisit|writeCollection/)).toEqual([])
  })
})

describe('the product page tracker', () => {
  const source = read(TRACKER)

  it('is a client component that renders nothing', () => {
    expect(source).toMatch(/^'use client'/)
    expect(source).toMatch(/return null/)
  })

  it('requires both scroll depth and dwell time before counting a read', () => {
    expect(source).toMatch(/READ_SCROLL_RATIO\s*=\s*0\.6/)
    expect(source).toMatch(/READ_DWELL_MS\s*=\s*45_000/)
    // The conjunction is the definition of "read"; either half alone is a skim.
    expect(source).toMatch(/!deepEnough \|\| Date\.now\(\) - openedAt < READ_DWELL_MS/)
  })

  it('dedupes through sessionStorage, so one reader is not counted per navigation', () => {
    expect(source).toMatch(/sessionStorage/)
    expect(source).toMatch(/SESSION_TTL_MS\s*=\s*30 \* 60 \* 1000/)
  })

  it('never retries, so a broken endpoint cannot become a loop', () => {
    expect(offendingLines(source, /setInterval/)).toEqual([])
    expect(source).toMatch(/\.catch\(\(\) => \{\}\)/)
  })

  it('survives storage access throwing, as it does in Safari private mode', () => {
    const guarded = codeLines(source).filter(([, line]) => /try \{/.test(line))
    expect(guarded.length).toBeGreaterThanOrEqual(2)
  })

  it('removes its listener and timer on unmount', () => {
    expect(source).toMatch(/removeEventListener\('scroll'/)
    expect(source).toMatch(/clearTimeout\(timer\)/)
    expect(source).toMatch(/return stop/)
  })

  it('is mounted on the product page', () => {
    const page = read('src/components/Store/ProductClient.js')
    expect(page).toMatch(/import VisitTracker from '\.\/VisitTracker'/)
    expect(page).toMatch(/<VisitTracker slug=\{product\.slug\} \/>/)
  })
})

describe('the Cloudflare Web Analytics beacon', () => {
  const source = read(ANALYTICS)

  it('loads the beacon as a module, the way Cloudflare ships it', () => {
    // next/script would load it as a classic script, and an ES module evaluated
    // as one can throw.
    expect(source).toMatch(/type="module"/)
    expect(source).toMatch(/static\.cloudflareinsights\.com\/beacon\.min\.js/)
    expect(offendingLines(source, /next\/script/)).toEqual([])
  })

  it('excludes the admin panel, so the owner is not their own traffic', () => {
    expect(source).toMatch(/usePathname/)
    expect(source).toMatch(/pathname\?\.startsWith\('\/admin'\)/)
  })

  it('stays out of development builds', () => {
    expect(source).toMatch(/process\.env\.NODE_ENV !== 'production'/)
  })

  it('takes the token from constants rather than inlining it', () => {
    expect(source).toMatch(/CF_BEACON_TOKEN/)
    expect(offendingLines(source, /[0-9a-f]{32}/)).toEqual([])
  })

  it('has a real token configured, not a placeholder', () => {
    const constants = read('src/lib/constants.js')
    const match = /CF_BEACON_TOKEN = '([^']*)'/.exec(constants)
    expect(match).not.toBeNull()
    expect(match[1]).toMatch(/^[0-9a-f]{32}$/)
  })

  it('mounts last in the body, per Cloudflare install instructions', () => {
    const layout = read(LAYOUT)
    expect(layout).toMatch(/import Analytics from '@\/components\/Analytics'/)
    const tag = '<Analytics />'
    const analyticsAt = layout.indexOf(tag)
    const bodyEndsAt = layout.indexOf('</body>')
    expect(analyticsAt).toBeGreaterThan(-1)
    expect(analyticsAt).toBeLessThan(bodyEndsAt)
    // Nothing else rendered between the beacon and the end of the body.
    expect(layout.slice(analyticsAt + tag.length, bodyEndsAt)).not.toMatch(/<[A-Za-z]/)
  })
})

describe('the dashboard panel', () => {
  const source = read('src/components/Admin/Dashboard.js')

  it('reads the visit summary from its own endpoint', () => {
    expect(source).toMatch(/\/api\/admin\/visits/)
    expect(source).toMatch(/<VisitStats /)
  })

  it('reports its own failures without replacing the revenue figures', () => {
    // The old rule was "swallow everything": an empty visits panel was
    // indistinguishable from "nobody visited" — and the visits route can fail
    // for real (KV hiccup, subrequest cap). Failures now surface inside the
    // visits panel only, via a dedicated flag, never through the shared
    // setError that would blank the revenue figures.
    const effect = source.slice(source.indexOf("fetch('/api/admin/visits"))
    expect(effect.slice(0, 600)).toMatch(/setVisitsError\(true\)/)
    expect(effect.slice(0, 600)).not.toMatch(/setError/)
  })

  it('states what «خوانده شد» means next to the number', () => {
    expect(source).toMatch(/۶۰٪/)
    expect(source).toMatch(/۴۵ ثانیه/)
  })
})
