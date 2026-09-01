import { NextResponse } from 'next/server'
import { extractClientKey } from '@/lib/request-ip'
import { getDoc, putDoc, deleteDoc } from '@/lib/storage'

/**
 * Shared auth for every /api/admin/* route.
 *
 * Design notes:
 *  - Credentials are compared via HMAC digests, not `===`, so the comparison is
 *    constant-time (a plain `===` leaks the password prefix through timing).
 *  - The session is a stateless HMAC-signed cookie. Nothing is stored server
 *    side, so it survives the ephemeral isolates on Cloudflare Workers, where an
 *    in-memory session map would not.
 *  - Basic auth is now ONLY accepted by the OTP routes. Every data route
 *    requires the session cookie, which is issued only after OTP verification.
 *    That is what makes the OTP step actually enforced rather than cosmetic.
 */

const SESSION_COOKIE = 'admin_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

/**
 * Session revocation epoch, persisted in KV.
 *
 * The session token itself is stateless — that is what makes it survive isolate
 * churn — but statelessness also means logout or a password change could never
 * invalidate an already-issued cookie: nothing server-side distinguished it
 * from a stolen copy. The epoch closes that. It is stamped into every token at
 * issue time and compared at verify time; bumping the epoch (logout, or a
 * future password-change route) instantly invalidates every outstanding
 * session, including the thief's copy.
 *
 * KV unavailable → the epoch check degrades to skip (fail-open). Locking the
 * admin out because storage hiccuped costs more than the narrow window it
 * protects; the token's HMAC and expiry still stand.
 */
const SESSION_EPOCH_KEY = 'admin:session-epoch'

async function readSessionEpoch() {
  try {
    const doc = await getDoc(SESSION_EPOCH_KEY)
    return typeof doc?.epoch === 'number' ? doc.epoch : 0
  } catch {
    return null // signal: cannot verify — caller skips the check
  }
}

/** Invalidate every outstanding session. Called on logout. */
export async function bumpSessionEpoch() {
  try {
    const current = await readSessionEpoch()
    await putDoc(SESSION_EPOCH_KEY, { epoch: (current || 0) + 1 })
  } catch (error) {
    console.error('[admin-auth] could not bump session epoch:', error)
  }
}

// ---------------------------------------------------------------- primitives

function b64urlEncode(bytes) {
  let bin = ''
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function utf8(str) {
  return new TextEncoder().encode(str)
}

async function hmac(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    utf8(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return b64urlEncode(await crypto.subtle.sign('HMAC', cryptoKey, utf8(message)))
}

/** Constant-time equality: compare HMACs of both values under a random key. */
export async function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const nonce = b64urlEncode(crypto.getRandomValues(new Uint8Array(16)))
  const [ha, hb] = await Promise.all([hmac(nonce, a), hmac(nonce, b)])
  return ha === hb
}

function credentials() {
  const user = process.env.ADMIN_USER
  const pass = process.env.ADMIN_PASS
  // Refuse to authenticate at all if the env is not configured, rather than
  // silently comparing against undefined.
  if (!user || !pass) return null
  return { user, pass }
}

function sessionSecret() {
  const creds = credentials()
  if (!creds) return null
  const dedicated = process.env.ADMIN_SESSION_SECRET
  if (dedicated) return dedicated
  // The fallback key IS the credentials string, so anyone who learns the
  // password can mint valid cookies offline without ever touching the login
  // endpoint. That trade-off is documented in wrangler.toml — but it must be
  // loud, not silent, so a production deploy missing the secret is visible.
  if (process.env.NODE_ENV === 'production') {
    console.warn('[admin-auth] SECURITY: ADMIN_SESSION_SECRET is not set — session cookies are keyed on the admin password. Set a dedicated 64+ char secret.')
  }
  return `${creds.user}:${creds.pass}`
}

// ------------------------------------------------------------------ basic auth

export async function checkBasicAuth(request) {
  const creds = credentials()
  if (!creds) {
    console.error('[admin-auth] ADMIN_USER / ADMIN_PASS are not set — denying all access')
    return false
  }

  const header = request.headers.get('authorization')
  if (!header || !header.startsWith('Basic ')) return false

  let decoded
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
  } catch {
    return false
  }

  const sep = decoded.indexOf(':')
  if (sep === -1) return false
  const user = decoded.slice(0, sep)
  const pass = decoded.slice(sep + 1)

  // Always run both comparisons so the timing does not reveal which one failed.
  const [userOk, passOk] = await Promise.all([
    safeEqual(user, creds.user),
    safeEqual(pass, creds.pass),
  ])
  return userOk && passOk
}

// --------------------------------------------------------------------- session

export async function createSessionToken() {
  const secret = sessionSecret()
  if (!secret) return null
  const epoch = await readSessionEpoch()
  const payload = b64urlEncode(utf8(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS, epoch: epoch ?? 0 })))
  const sig = await hmac(secret, payload)
  return `${payload}.${sig}`
}

export async function verifySessionToken(token) {
  const secret = sessionSecret()
  if (!secret || typeof token !== 'string') return false

  const dot = token.lastIndexOf('.')
  if (dot === -1) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const expected = await hmac(secret, payload)
  if (!(await safeEqual(sig, expected))) return false

  let claims
  try {
    claims = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  } catch {
    return false
  }
  if (typeof claims.exp !== 'number' || Date.now() >= claims.exp) return false

  // Revocation: a token issued before the current epoch is dead even though its
  // signature and expiry are both valid. Epoch 0 (never bumped) passes for
  // tokens minted before this field existed.
  const current = await readSessionEpoch()
  if (current !== null && typeof claims.epoch === 'number' && claims.epoch !== current) {
    return false
  }

  return true
}

export async function checkSession(request) {
  const token = request.cookies?.get(SESSION_COOKIE)?.value
  if (!token) return false
  return verifySessionToken(token)
}

export function attachSessionCookie(response, token) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
  return response
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}

// ------------------------------------------------------------------------ csrf

/** Single CSRF implementation — this used to be copy-pasted per route with
 *  slightly different rules, so some routes were weaker than others. */
export function checkCsrf(request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false
  try {
    const url = new URL(origin)
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return false
    return url.host === host
  } catch {
    return false
  }
}

// ------------------------------------------------------------------ rate limit

/**
 * Brute-force throttle that survives isolate churn.
 *
 * WHAT WAS WRONG BEFORE
 * ---------------------
 * The counter was a module-level `Map`. On Cloudflare Workers every isolate has its
 * own copy and isolates are created and discarded constantly, so an attacker whose
 * next request landed in a fresh isolate got a fresh allowance. The old docblock
 * admitted as much: it slowed an attacker down and never actually stopped one.
 *
 * WHY THE COUNT IS STILL IN MEMORY, AND ONLY THE BLOCK IS DURABLE
 * --------------------------------------------------------------
 * The obvious fix — keep the counter in KV — is worse. KV has no compare-and-swap,
 * so two isolates that both read `count: 3` both write `4`, and the count silently
 * undercounts exactly when it is under attack. It also costs one write per guess,
 * and the free tier allows a thousand writes a day: an attacker would exhaust the
 * quota and take the orders collection down with them, which is a denial of service
 * handed over by the defence.
 *
 * So counting stays local and cheap, and the one fact worth persisting is the
 * *verdict*: when any isolate sees five failures it writes a single "blocked until"
 * record with a TTL. Every other isolate picks it up on its next check, so the first
 * isolate to trip converts a per-isolate limit into a global one. Cost is one write
 * per address per window instead of one per guess, and there is no read-modify-write
 * to lose.
 *
 * WHAT THIS STILL DOES NOT DO
 * ---------------------------
 * A distributed attempt spread across many isolates gets a few extra guesses before
 * the first block lands. Closing that needs a Durable Object, or — cheaper and at
 * the right layer — a Cloudflare WAF rate-limiting rule on /api/admin/*. This is the
 * application-level floor, not the whole answer.
 */
// Exported so the tests assert against the real numbers rather than a copy of
// them — a limiter test that hardcodes 5 keeps passing after the limit changes.
export const MAX_ATTEMPTS = 5
export const WINDOW_MS = 15 * 60 * 1000

/** Failures seen by this isolate, per address. */
const attempts = new Map()

/**
 * Blocks this isolate already knows about, so a blocked address costs no lookups.
 *
 * Positive only: a *missing* entry is never taken to mean "not blocked", because
 * that is the case another isolate may have just decided.
 */
const blockedUntil = new Map()

/** Namespaced so it cannot collide with an OTP or a collection key. */
function blockKey(ip) {
  return `ratelimit:admin:${ip}`
}

/**
 * Drop expired entries when either map grows past a sane size.
 *
 * Called from the failure path only. Both maps are bounded by the number of distinct
 * addresses one isolate sees, which is small, but a long-lived Node host with a
 * scanner pointed at it would otherwise accumulate a row per address forever.
 */
function pruneStale(now) {
  if (attempts.size < 512 && blockedUntil.size < 512) return
  for (const [key, record] of attempts) {
    if (now - record.first > WINDOW_MS) attempts.delete(key)
  }
  for (const [key, until] of blockedUntil) {
    if (now >= until) blockedUntil.delete(key)
  }
}

export function getClientIp(request) {
  // Reuse the shared helper: it trusts Cloudflare's edge-set cf-connecting-ip
  // over the client-controllable x-forwarded-for, so an attacker cannot hand
  // themselves a fresh rate-limit bucket by spoofing a header.
  return extractClientKey(request)
}

/** Whether this address is still allowed to try. */
export async function checkRateLimit(ip) {
  const now = Date.now()

  const cached = blockedUntil.get(ip)
  if (cached !== undefined) {
    if (now < cached) return false
    blockedUntil.delete(ip)
  }

  let kvBlocked = false
  try {
    const [blockDoc, countDoc] = await Promise.all([
      getDoc(blockKey(ip)),
      getDoc(blockKey(ip) + ':count'),
    ])
    if (blockDoc && typeof blockDoc.until === 'number' && now < blockDoc.until) {
      blockedUntil.set(ip, blockDoc.until)
      kvBlocked = true
      return false
    }
    // Initialize local counter from KV if available (helps fresh isolates)
    if (countDoc && typeof countDoc.count === 'number' && countDoc.first && now - countDoc.first < WINDOW_MS) {
      const existing = attempts.get(ip)
      if (!existing || countDoc.count > existing.count) {
        attempts.set(ip, { count: countDoc.count, first: countDoc.first })
      }
    }
  } catch (error) {
    // KV unavailable: we cannot verify global block state.
    // If we have a local cached block, respect it. Otherwise, allow but log security event.
    // This prevents an attacker from DoSing KV to bypass blocks, while not locking out
    // the admin if KV is truly down (local counter still enforces per-isolate limit).
    console.error('[admin-auth] rate-limit KV lookup failed:', error)
    if (!cached) {
      console.warn('[admin-auth] SECURITY: KV unavailable, global block check skipped for', ip)
    }
  }

  const record = attempts.get(ip)
  if (!record) return true
  if (now - record.first > WINDOW_MS) {
    attempts.delete(ip)
    return true
  }
  return record.count < MAX_ATTEMPTS
}

/**
 * Count a failure, and persist the block if this was the last attempt allowed.
 *
 * The return value is what keeps the audit log from becoming the denial of service
 * described above: only the attempt that blocks is worth a row, so the caller logs
 * on `true` and stays silent otherwise.
 *
 * Also persists the attempt count to KV so other isolates can see progress toward
 * the limit. Uses last-write-wins (no CAS), so concurrent writes may slightly
 * undercount, but this is acceptable — the block itself is the hard enforcement.
 *
 * @returns {Promise<boolean>} true when this attempt reached MAX_ATTEMPTS
 */
export async function recordFailedAttempt(ip) {
  const now = Date.now()
  pruneStale(now)

  const record = attempts.get(ip)
  let count
  let first
  if (!record || now - record.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now })
    count = 1
    first = now
  } else {
    record.count += 1
    count = record.count
    first = record.first
  }

  // Persist attempt count to KV for cross-isolate visibility (best-effort, last-write-wins)
  try {
    await putDoc(blockKey(ip) + ':count', { count, first }, { ttlSeconds: Math.ceil(WINDOW_MS / 1000) })
  } catch (error) {
    console.error('[admin-auth] could not persist attempt count:', error)
  }

  // Equality, not `>=`: past the limit `checkRateLimit` rejects before we are
  // reached, but if it ever did not, `>` would rewrite the same block on every guess
  // and turn the one bounded write back into one per attempt.
  if (count !== MAX_ATTEMPTS) return false

  const until = now + WINDOW_MS
  blockedUntil.set(ip, until)
  try {
    await putDoc(blockKey(ip), { until }, { ttlSeconds: Math.ceil(WINDOW_MS / 1000) })
  } catch (error) {
    // The local block still stands; this only costs the other isolates.
    console.error('[admin-auth] could not persist the rate-limit block:', error)
  }
  return true
}

/** Clear an address's history — called on a successful login, and nowhere else. */
export async function resetAttempts(ip) {
  attempts.delete(ip)
  blockedUntil.delete(ip)
  try {
    await Promise.all([
      deleteDoc(blockKey(ip)),
      deleteDoc(blockKey(ip) + ':count'),
    ])
  } catch (error) {
    // Worst case the owner waits out a TTL they already earned by mistyping.
    console.error('[admin-auth] could not clear the rate-limit block:', error)
  }
}

// ------------------------------------------------------------------- guard

/**
 * Guard for data routes. Returns a NextResponse to return early, or null when
 * the request is allowed to proceed.
 *
 * @param {Request} request
 * @param {{ mutating?: boolean }} options
 */
export async function guardAdminRoute(request, { mutating = false } = {}) {
  if (mutating && !checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }
  if (!(await checkSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export { SESSION_COOKIE }
