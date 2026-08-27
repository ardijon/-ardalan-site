/**
 * Persian → English machine translation for the admin panel.
 *
 * WHY THE SERVER AND NOT THE BROWSER
 * ----------------------------------
 * Google is blocked from Iran, so a fetch from the panel's own browser fails for
 * the one person who uses the panel. The request goes out from the Worker instead,
 * whose egress is Cloudflare's, not Tehran's. The consequence is worth stating
 * plainly: this feature does not work under `next dev` on a machine in Iran. It is
 * not broken there — it is unreachable there, and the route says so.
 *
 * WHY TWO PROVIDERS
 * -----------------
 * `translate_a/single?client=gtx` is undocumented. It is free, needs no key, and
 * Google can change or throttle it whenever it likes, with no announcement and no
 * deprecation window. MyMemory is documented and free but caps anonymous use per
 * day and only accepts short strings. Neither alone is something to build a panel
 * button on; either one covering for the other is good enough for a draft that a
 * human is going to read before it ships.
 *
 * The parsers are exported separately from the fetching so the response shapes —
 * the part that actually breaks — can be tested without a network.
 */

const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=fa&tl=en&dt=t'
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get'

/** MyMemory rejects anything longer; it is skipped rather than truncated. */
const MYMEMORY_MAX_CHARS = 500

export const MAX_TEXT_LENGTH = 5000

/**
 * Twenty, because each text may cost two subrequests when the first provider fails
 * and a Cloudflare Worker on the free plan gets fifty per incoming request.
 */
export const MAX_BATCH = 20

const TIMEOUT_MS = 8000

/** How many texts are in flight at once. Six is workerd's simultaneous-connection cap. */
const CONCURRENCY = 4

// ------------------------------------------------------------------- parsers

/**
 * gtx returns `[[[chunk, source, …], [chunk, source, …]], …]`.
 *
 * The chunks are sentence-level and must be concatenated in order: reading only
 * `payload[0][0][0]`, which is the obvious thing to write, silently truncates every
 * multi-sentence field to its first sentence.
 */
export function parseGoogleTranslation(payload) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return ''
  return payload[0]
    .map(segment => (Array.isArray(segment) ? segment[0] : ''))
    .filter(chunk => typeof chunk === 'string')
    .join('')
    .trim()
}

/**
 * MyMemory returns `{ responseData: { translatedText } }`.
 *
 * It also reports quota exhaustion *inside that field*, in capitals, with HTTP 200.
 * Reading it naively would save "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE
 * TRANSLATIONS FOR TODAY" into a product as its English description.
 */
export function parseMyMemoryTranslation(payload) {
  const translated = payload?.responseData?.translatedText
  if (typeof translated !== 'string' || !translated.trim()) return ''
  if (/^\s*MYMEMORY (WARNING|ERROR)/i.test(translated)) return ''
  if (/^\s*(QUERY LENGTH LIMIT|INVALID)/i.test(translated)) return ''
  return translated.trim()
}

// ------------------------------------------------------------------ providers

async function requestJson(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

const PROVIDERS = [
  {
    name: 'google',
    async run(text) {
      // POST rather than the usual `&q=` query string: Persian URL-encodes to six
      // characters per letter, so a paragraph in the query blows past the URL length
      // limit and comes back as a 4xx that looks like the endpoint being gone.
      const payload = await requestJson(GOOGLE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ q: text }).toString(),
      })
      return parseGoogleTranslation(payload)
    },
  },
  {
    name: 'mymemory',
    async run(text) {
      if (text.length > MYMEMORY_MAX_CHARS) return ''
      const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=fa|en&de=admin@ai2apps.sbs`
      return parseMyMemoryTranslation(await requestJson(url))
    },
  },
]

/**
 * One string, or a reason it could not be translated.
 *
 * Never throws and never returns a partial guess: an empty result from a provider
 * is treated exactly like a failure, because "" written into an English box looks
 * like a successful translation of nothing.
 */
export async function translateToEnglish(text) {
  const source = typeof text === 'string' ? text.trim() : ''
  if (!source) return { text: '' }
  if (source.length > MAX_TEXT_LENGTH) return { error: 'too_long' }

  const failures = []

  for (const provider of PROVIDERS) {
    try {
      const translated = await provider.run(source)
      if (translated) return { text: translated, provider: provider.name }
      failures.push(`${provider.name}: empty`)
    } catch (error) {
      failures.push(`${provider.name}: ${error?.message || 'failed'}`)
    }
  }

  return { error: 'unavailable', detail: failures.join(' | ') }
}

/** Bounded-concurrency map that keeps input order. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  })

  await Promise.all(workers)
  return results
}

/**
 * A batch, in the order given.
 *
 * Concurrency is deliberately low. gtx publishes no rate limit, which means the way
 * to discover it is to trip it — and tripping it from the Worker's IP would break
 * the button for every request, not just this one.
 */
export async function translateAll(texts) {
  return mapLimit(texts, CONCURRENCY, translateToEnglish)
}
