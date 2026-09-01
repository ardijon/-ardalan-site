import { getDoc, putDoc, deleteDoc } from '@/lib/storage'

/**
 * Generic KV-backed rate limiter with local cache.
 *
 * Uses the same pattern as admin-auth: local counting per isolate,
 * with periodic persistence to KV for cross-isolate visibility.
 * Blocks are persisted to KV with TTL and cached locally.
 */

export function createRateLimiter({
  namespace = 'ratelimit',
  maxAttempts = 10,
  windowMs = 15 * 60 * 1000,
  // "request" counts every call to check() (protects read/track endpoints
  // against enumeration even when nothing ever "fails"); "failure" only counts
  // explicit recordFailure() calls (protects credential-style endpoints where
  // legitimate users may need several attempts).
  mode = 'request',
} = {}) {
  const attempts = new Map()
  const blockedUntil = new Map()

  function key(ip) {
    return `${namespace}:${ip}`
  }

  function countKey(ip) {
    return `${namespace}:${ip}:count`
  }

  function pruneStale(now) {
    if (attempts.size < 512 && blockedUntil.size < 512) return
    for (const [k, record] of attempts) {
      if (now - record.first > windowMs) attempts.delete(k)
    }
    for (const [k, until] of blockedUntil) {
      if (now >= until) blockedUntil.delete(k)
    }
  }

  /**
   * Take one request from the window and return whether it is allowed.
   *
   * The count is incremented HERE, before the verdict — the old design counted
   * only in recordFailure(), which nothing ever called, so check() always read
   * an empty map and every route behind it was unlimited. Counting on check()
   * is what a public endpoint needs: it caps enumeration, scraping and spam
   * regardless of whether the request ends in success or failure.
   *
   * The local map is the primary counter; the KV count doc is reconciled into
   * it first so a fresh isolate inherits the window instead of starting clean.
   */
  async function check(ip) {
    const now = Date.now()

    const cached = blockedUntil.get(ip)
    if (cached !== undefined) {
      if (now < cached) return { allowed: false, remaining: 0, retryAfter: Math.ceil((cached - now) / 1000) }
      blockedUntil.delete(ip)
    }

    try {
      const [blockDoc, countDoc] = await Promise.all([
        getDoc(key(ip)),
        getDoc(countKey(ip)),
      ])
      if (blockDoc && typeof blockDoc.until === 'number' && now < blockDoc.until) {
        blockedUntil.set(ip, blockDoc.until)
        return { allowed: false, remaining: 0, retryAfter: Math.ceil((blockDoc.until - now) / 1000) }
      }
      if (countDoc && typeof countDoc.count === 'number' && countDoc.first && now - countDoc.first < windowMs) {
        const existing = attempts.get(ip)
        if (!existing || countDoc.count > existing.count) {
          attempts.set(ip, { count: countDoc.count, first: countDoc.first })
        }
      }
    } catch (error) {
      console.error(`[rate-limit:${namespace}] KV lookup failed:`, error)
      if (!cached) {
        console.warn(`[rate-limit:${namespace}] SECURITY: KV unavailable, global block check skipped for`, ip)
      }
    }

    // Count this request locally.
    const record = attempts.get(ip)
    if (!record || now - record.first > windowMs) {
      attempts.set(ip, { count: 1, first: now })
      persist(ip, 1, now)
      return { allowed: maxAttempts > 1, remaining: Math.max(0, maxAttempts - 1), retryAfter: 0 }
    }
    record.count += 1
    const allowed = record.count < maxAttempts
    persist(ip, record.count, record.first)

    if (!allowed && mode === 'request') {
      // Request-mode limiters block durably as soon as the window is exhausted,
      // so every isolate sees the block — failure-mode limiters leave blocking
      // to recordFailure(), which is only called on real failures.
      block(ip, now)
    }
    return { allowed, remaining: Math.max(0, maxAttempts - record.count), retryAfter: 0 }
  }

  /**
   * Best-effort KV persistence of the running count, so a fresh isolate does
   * not reset the window mid-attack. Fire-and-forget: a failed write must never
   * fail the request itself, and the local counter still enforces per-isolate.
   */
  function persist(ip, count, first) {
    putDoc(countKey(ip), { count, first }, { ttlSeconds: Math.ceil(windowMs / 1000) })
      .catch(error => console.error(`[rate-limit:${namespace}] could not persist attempt count:`, error))
  }

  function block(ip, now) {
    const until = now + windowMs
    blockedUntil.set(ip, until)
    putDoc(key(ip), { until }, { ttlSeconds: Math.ceil(windowMs / 1000) })
      .catch(error => console.error(`[rate-limit:${namespace}] could not persist block:`, error))
    return { blocked: true, retryAfter: Math.ceil(windowMs / 1000) }
  }

  /**
   * Count an explicit failure. In failure mode this is what drives the block;
   * in request mode the count is already taken by check(), so this only forces
   * an immediate durable block at the limit.
   */
  async function recordFailure(ip) {
    const now = Date.now()
    pruneStale(now)

    const record = attempts.get(ip)
    let count
    let first
    if (!record || now - record.first > windowMs) {
      attempts.set(ip, { count: 1, first: now })
      count = 1
      first = now
    } else {
      record.count += 1
      count = record.count
      first = record.first
    }

    try {
      // `first` must be the CURRENT window's start: persisting the old record's
      // `first` after a reset handed other isolates a timestamp outside the
      // window, whose count they then ignored — the cross-isolate undercount
      // this persist exists to prevent.
      await putDoc(countKey(ip), { count, first }, { ttlSeconds: Math.ceil(windowMs / 1000) })
    } catch (error) {
      console.error(`[rate-limit:${namespace}] could not persist attempt count:`, error)
    }

    if (count !== maxAttempts) return { blocked: false, retryAfter: 0 }

    block(ip, now)
    return { blocked: true, retryAfter: Math.ceil(windowMs / 1000) }
  }

  async function reset(ip) {
    attempts.delete(ip)
    blockedUntil.delete(ip)
    try {
      await Promise.all([deleteDoc(key(ip)), deleteDoc(countKey(ip))])
    } catch (error) {
      console.error(`[rate-limit:${namespace}] could not clear block:`, error)
    }
  }

  return { check, recordFailure, reset, maxAttempts, windowMs }
}
