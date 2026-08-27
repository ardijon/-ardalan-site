import fs from 'fs'
import path from 'path'
import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
  MAX_ATTEMPTS,
  WINDOW_MS,
} from '@/lib/admin-auth'
import { getDoc, putDoc } from '@/lib/storage'
import { collectFiles, codeLines } from './helpers/source-scan'

/**
 * The login throttle, and the one property it never had before.
 *
 * The old limiter was a module-level `Map`. It passed every test you could write
 * against it in Node — where there is one process and the Map is global — and did
 * almost nothing on Cloudflare Workers, where each isolate has its own copy and
 * isolates are discarded constantly. So the test that matters here is not "does it
 * count to five": it is "does a block decided somewhere else get honoured".
 *
 * That is testable in Node because the storage layer's document driver falls back to
 * an in-process map with the same interface KV has, so writing the block record by
 * hand is a faithful stand-in for another isolate having written it.
 */

const KEY = ip => `ratelimit:admin:${ip}`

// Each test gets its own address, so a leftover counter cannot leak between them.
let counter = 0
function freshIp() {
  counter += 1
  return `198.51.100.${counter}`
}

async function failTimes(ip, times) {
  const results = []
  for (let i = 0; i < times; i++) results.push(await recordFailedAttempt(ip))
  return results
}

describe('the counter', () => {
  it('lets an unseen address through', async () => {
    expect(await checkRateLimit(freshIp())).toBe(true)
  })

  it('allows exactly MAX_ATTEMPTS failures', async () => {
    const ip = freshIp()

    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      await recordFailedAttempt(ip)
      expect(await checkRateLimit(ip)).toBe(true)
    }

    await recordFailedAttempt(ip)
    expect(await checkRateLimit(ip)).toBe(false)
  })

  it('reports only the attempt that used up the allowance', async () => {
    // The caller audits on `true`. Returning it more than once would put a row in
    // the log for every subsequent guess, which is the write amplification the
    // whole design is arranged to avoid.
    const results = await failTimes(freshIp(), MAX_ATTEMPTS + 3)
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(results[MAX_ATTEMPTS - 1]).toBe(true)
  })
})

describe('the block outlives the isolate that decided it', () => {
  it('persists a block record with an expiry', async () => {
    const ip = freshIp()
    const before = Date.now()

    await failTimes(ip, MAX_ATTEMPTS)

    const doc = await getDoc(KEY(ip))
    expect(typeof doc?.until).toBe('number')
    expect(doc.until).toBeGreaterThanOrEqual(before + WINDOW_MS)
  })

  it('honours a block written by someone else, with an empty local counter', async () => {
    // This is the whole point of the rewrite. The old Map-based limiter returned
    // `true` here — a fresh isolate meant a fresh allowance, so an attacker only had
    // to be unlucky enough to keep landing in new isolates, which on Workers is the
    // normal case rather than the unlucky one.
    const ip = freshIp()
    expect(await checkRateLimit(ip)).toBe(true)

    await putDoc(KEY(ip), { until: Date.now() + WINDOW_MS }, { ttlSeconds: WINDOW_MS / 1000 })

    expect(await checkRateLimit(ip)).toBe(false)
  })

  it('ignores a block whose window has already passed', async () => {
    const ip = freshIp()
    await putDoc(KEY(ip), { until: Date.now() - 1 }, { ttlSeconds: 60 })
    expect(await checkRateLimit(ip)).toBe(true)
  })

  it('ignores a record that is not shaped like a block', async () => {
    // KV returns whatever is stored. A malformed value must not become an
    // indefinite lockout, and must not become a crash on the login route either.
    const ip = freshIp()
    await putDoc(KEY(ip), { until: 'به زودی' }, { ttlSeconds: 60 })
    expect(await checkRateLimit(ip)).toBe(true)
  })
})

describe('a successful login clears the block everywhere', () => {
  it('deletes the durable record, not just the local counter', async () => {
    // Leaving the record behind would lock the owner out for the rest of the window
    // immediately after they logged in — from any isolate that had not yet cached it.
    const ip = freshIp()
    await failTimes(ip, MAX_ATTEMPTS)
    expect(await getDoc(KEY(ip))).toBeTruthy()

    await resetAttempts(ip)

    expect(await getDoc(KEY(ip))).toBeNull()
    expect(await checkRateLimit(ip)).toBe(true)
  })
})

describe('the window', () => {
  afterEach(() => jest.useRealTimers())

  it('expires, and the block is written once rather than per guess', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
    const start = new Date('2026-08-23T10:00:00.000Z').getTime()
    jest.setSystemTime(start)

    const ip = freshIp()
    await failTimes(ip, MAX_ATTEMPTS)
    const first = (await getDoc(KEY(ip))).until
    expect(first).toBe(start + WINDOW_MS)

    // More guesses inside the window must not rewrite the record. If they did, the
    // one bounded write would be one write per attempt again — and the block would
    // also keep sliding forward, which is not what a fifteen-minute window means.
    jest.setSystemTime(start + 60_000)
    await failTimes(ip, 3)
    expect((await getDoc(KEY(ip))).until).toBe(first)
    expect(await checkRateLimit(ip)).toBe(false)

    // Past the window the address is allowed to try again.
    jest.setSystemTime(start + WINDOW_MS + 1)
    expect(await checkRateLimit(ip)).toBe(true)
    // And the allowance is a full one, not the leftovers of the last window.
    expect(await recordFailedAttempt(ip)).toBe(false)
  })
})

describe('the limiter is always awaited', () => {
  /**
   * A missing `await` disables the limit completely and silently.
   *
   * `checkRateLimit` returns a Promise now. `if (!checkRateLimit(ip))` is `if (!aPromise)`,
   * which is always false — so the route would accept unlimited attempts while still
   * looking, line for line, like it was checking. Nothing throws and no test of the
   * limiter itself would notice, because the limiter is fine; the caller is not.
   */
  const GUARDED = ['checkRateLimit', 'recordFailedAttempt', 'resetAttempts']
  const DEFINITION = path.join('src', 'lib', 'admin-auth.js')

  const callers = collectFiles(path.join(process.cwd(), 'src')).filter(file => {
    if (file.endsWith(DEFINITION)) return false
    const source = fs.readFileSync(file, 'utf8')
    return GUARDED.some(name => source.includes(`${name}(`))
  })

  it('finds the call sites', () => {
    expect(callers.length).toBeGreaterThan(0)
  })

  it('awaits every call', () => {
    const bare = []
    for (const file of callers) {
      for (const [lineNo, code] of codeLines(fs.readFileSync(file, 'utf8'))) {
        for (const name of GUARDED) {
          // The import list mentions the names without calling them.
          if (!new RegExp(`${name}\\s*\\(`).test(code)) continue
          if (/await/.test(code)) continue
          bare.push(`${path.relative(process.cwd(), file)}:${lineNo}: ${code.trim()}`)
        }
      }
    }
    expect(bare).toEqual([])
  })
})
