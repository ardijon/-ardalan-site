/**
 * Shared utility to extract a trusted visitor key from a request.
 *
 * TRUST MODEL
 * -----------
 * This app runs behind Cloudflare (see wrangler.toml). Cloudflare's edge sets
 * `cf-connecting-ip` itself and overwrites any value the client tried to send,
 * so it is the only header here that cannot be forged. When it is present we
 * use it and stop — deliberately never falling through to the headers below,
 * because doing so would let a caller pick their own rate-limit bucket.
 *
 * The remaining headers are client-controllable and exist only so that local
 * development and non-Cloudflare hosts still produce a usable key.
 *
 * (An earlier version checked Netlify's `x-nf-client-connection-ip` *before*
 * Cloudflare's header. Once the site left Netlify nothing set that header
 * any more, so anyone could send it and be handed a fresh rate-limit bucket on
 * every request. It has been removed along with the rest of the Netlify setup.)
 *
 * Returns 'unknown' as a last resort so rate-limit / dedupe buckets never
 * collide on a falsy value.
 */

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
]

function isPrivate(ip) {
  return PRIVATE_RANGES.some((re) => re.test(ip))
}

export function extractClientKey(request) {
  // Trusted: set by the Cloudflare edge, unforgeable by the client.
  // Used unconditionally when present — no fallback, by design.
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf

  // --- Untrusted fallbacks: local dev / non-Cloudflare hosts only ---

  // x-forwarded-for — first entry is the original client
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const candidates = xff.split(',').map((s) => s.trim()).filter(Boolean)
    for (const ip of candidates) {
      if (ip && !isPrivate(ip)) return ip
    }
  }

  const real = request.headers.get('x-real-ip')
  if (real && !isPrivate(real)) return real

  if (request.ip) return request.ip

  return 'unknown'
}
