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

    const record = attempts.get(ip)
    if (!record) return { allowed: true, remaining: maxAttempts, retryAfter: 0 }
    if (now - record.first > windowMs) {
      attempts.delete(ip)
      return { allowed: true, remaining: maxAttempts, retryAfter: 0 }
    }
    return { allowed: record.count < maxAttempts, remaining: Math.max(0, maxAttempts - record.count), retryAfter: 0 }
  }

  async function recordFailure(ip) {
    const now = Date.now()
    pruneStale(now)

    const record = attempts.get(ip)
    let count
    if (!record || now - record.first > windowMs) {
      attempts.set(ip, { count: 1, first: now })
      count = 1
    } else {
      record.count += 1
      count = record.count
    }

    try {
      await putDoc(countKey(ip), { count, first: record?.first || now }, { ttlSeconds: Math.ceil(windowMs / 1000) })
    } catch (error) {
      console.error(`[rate-limit:${namespace}] could not persist attempt count:`, error)
    }

    if (count !== maxAttempts) return { blocked: false, retryAfter: 0 }

    const until = now + windowMs
    blockedUntil.set(ip, until)
    try {
      await putDoc(key(ip), { until }, { ttlSeconds: Math.ceil(windowMs / 1000) })
    } catch (error) {
      console.error(`[rate-limit:${namespace}] could not persist block:`, error)
    }
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