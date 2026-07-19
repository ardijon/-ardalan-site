/**
 * Shared utility to extract a trusted visitor key from a request.
 *
 * Precedence (most trusted first):
 *   1. Netlify: x-nf-client-connection-ip
 *   2. Cloudflare: cf-connecting-ip
 *   3. x-forwarded-for — first public IP (client, not last proxy)
 *   4. x-real-ip
 *   5. request.ip (Node built-in)
 *
 * Returns 'unknown' as a last resort so rate-limit / dedupe buckets
 * never collide on a falsy value.
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
  // 1. Netlify
  const nf = request.headers.get('x-nf-client-connection-ip')
  if (nf && !isPrivate(nf)) return nf

  // 2. Cloudflare
  const cf = request.headers.get('cf-connecting-ip')
  if (cf && !isPrivate(cf)) return cf

  // 3. x-forwarded-for — first entry is the original client
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const candidates = xff.split(',').map((s) => s.trim()).filter(Boolean)
    for (const ip of candidates) {
      if (ip && !isPrivate(ip)) return ip
    }
  }

  // 4. x-real-ip
  const real = request.headers.get('x-real-ip')
  if (real && !isPrivate(real)) return real

  // 5. request.ip (Vercel / Node built-in)
  if (request.ip) return request.ip

  return 'unknown'
}
