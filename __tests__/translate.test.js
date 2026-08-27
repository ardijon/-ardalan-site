import fs from 'fs'
import path from 'path'
import {
  parseGoogleTranslation,
  parseMyMemoryTranslation,
  translateToEnglish,
  MAX_BATCH,
  MAX_TEXT_LENGTH,
} from '@/lib/translate'
import {
  TRANSLATABLE_TEXTS,
  TRANSLATABLE_LISTS,
  TRANSLATABLE_SCREENSHOT,
  TRANSLATABLE_TESTIMONIAL,
  EMPTY_SCREENSHOT,
  EMPTY_TESTIMONIAL,
  emptyProduct,
} from '@/lib/product-shape'

/**
 * The translate button.
 *
 * Two providers, both of which answer with HTTP 200 when they have not translated
 * anything: gtx returns a shape with no segments, and MyMemory puts its quota
 * message *inside* the translation field. So the tests that matter here are about
 * refusing bad output, not about producing good output — a wrong translation is a
 * draft a human will fix, but a quota warning saved as a product description is a
 * quota warning on the store.
 *
 * Nothing here touches the network. `fetch` is replaced per test, because the whole
 * point of the fallback chain is what it does when a provider misbehaves, and a real
 * request cannot be made to misbehave on demand.
 */

describe('parseGoogleTranslation', () => {
  it('should join every sentence chunk in order', () => {
    // Reading payload[0][0][0] — the obvious shortcut — truncates a paragraph to its
    // first sentence, and the loss is invisible because the first sentence is right.
    const payload = [[['First one. ', 'اول. ', null, null, 10], ['Then the rest.', 'بعد بقیه.', null, null, 3]], null, 'fa']
    expect(parseGoogleTranslation(payload)).toBe('First one. Then the rest.')
  })

  it('should return empty for every shape that is not a translation', () => {
    for (const payload of [null, undefined, '', 42, {}, [], [null], [[]], [[null]], [['nope']]]) {
      expect(parseGoogleTranslation(payload)).toBe('')
    }
  })
})

describe('parseMyMemoryTranslation', () => {
  it('should read the translated text', () => {
    expect(parseMyMemoryTranslation({ responseData: { translatedText: '  Hello  ' } })).toBe('Hello')
  })

  it('should reject the quota warning it returns with HTTP 200', () => {
    // Verbatim from the API. Without this it lands in an English description.
    const warning = 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY'
    expect(parseMyMemoryTranslation({ responseData: { translatedText: warning } })).toBe('')
  })

  it('should reject its other in-band error strings', () => {
    for (const text of ['QUERY LENGTH LIMIT EXCEEDED', 'INVALID LANGUAGE PAIR SPECIFIED', 'MYMEMORY ERROR: X', '   ']) {
      expect(parseMyMemoryTranslation({ responseData: { translatedText: text } })).toBe('')
    }
  })

  it('should return empty for a malformed body', () => {
    for (const payload of [null, undefined, {}, { responseData: null }, { responseData: {} }]) {
      expect(parseMyMemoryTranslation(payload)).toBe('')
    }
  })
})

describe('translateToEnglish', () => {
  const realFetch = global.fetch
  afterEach(() => { global.fetch = realFetch })

  const google = payload => ({ ok: true, status: 200, json: async () => payload })

  it('should pass blank input straight through without a request', async () => {
    global.fetch = jest.fn()
    for (const input of ['', '   ', null, undefined, 42]) {
      expect(await translateToEnglish(input)).toEqual({ text: '' })
    }
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should refuse text longer than the cap without a request', async () => {
    global.fetch = jest.fn()
    const result = await translateToEnglish('ا'.repeat(MAX_TEXT_LENGTH + 1))
    expect(result).toEqual({ error: 'too_long' })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should use Google when it answers', async () => {
    global.fetch = jest.fn(async () => google([[['Live demo', 'دموی زنده']]]))
    const result = await translateToEnglish('دموی زنده')
    expect(result.text).toBe('Live demo')
    expect(result.provider).toBe('google')
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should fall back to MyMemory when Google throws', async () => {
    global.fetch = jest.fn(async url => {
      if (String(url).includes('translate.googleapis.com')) throw new Error('ECONNREFUSED')
      return { ok: true, status: 200, json: async () => ({ responseData: { translatedText: 'Live demo' } }) }
    })

    const result = await translateToEnglish('دموی زنده')
    expect(result).toEqual({ text: 'Live demo', provider: 'mymemory' })
  })

  it('should fall back when Google answers with no segments', async () => {
    // An empty result is treated as a failure on purpose: writing '' into an English
    // box is indistinguishable from a successful translation of nothing.
    global.fetch = jest.fn(async url => {
      if (String(url).includes('translate.googleapis.com')) return google([null, null, 'fa'])
      return { ok: true, status: 200, json: async () => ({ responseData: { translatedText: 'Live demo' } }) }
    })

    expect((await translateToEnglish('دموی زنده')).provider).toBe('mymemory')
  })

  it('should report unavailable rather than throw when both fail', async () => {
    global.fetch = jest.fn(async () => { throw new Error('network unreachable') })

    const result = await translateToEnglish('دموی زنده')
    expect(result.error).toBe('unavailable')
    expect(result.detail).toContain('google')
    expect(result.detail).toContain('mymemory')
    expect(result.text).toBeUndefined()
  })

  it('should not send a MyMemory request for text over its own limit', async () => {
    // MyMemory rejects anything past 500 characters, so a long field that Google
    // failed on must not spend a second round trip discovering that.
    const calls = []
    global.fetch = jest.fn(async url => {
      calls.push(String(url))
      throw new Error('down')
    })

    await translateToEnglish('ا'.repeat(600))
    expect(calls.filter(u => u.includes('mymemory')).length).toBe(0)
  })
})

describe('translatable field tables', () => {
  /** Every dotted path in `value` whose object is a `{fa, en}` pair. */
  function findPairs(value, prefix = '') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []

    const keys = Object.keys(value)
    if (keys.length === 2 && keys.includes('fa') && keys.includes('en')) return [prefix]

    return keys.flatMap(key => findPairs(value[key], prefix ? `${prefix}.${key}` : key))
  }

  it('should cover every fa/en pair in the product shape', () => {
    // This is the test the tables exist for: add a bilingual field to a product and
    // this fails until it has a translate button, instead of the button quietly
    // being absent on the one field nobody checks.
    const registered = new Set([...TRANSLATABLE_TEXTS, ...TRANSLATABLE_LISTS])
    const missing = findPairs(emptyProduct()).filter(p => !registered.has(p))
    expect(missing).toEqual([])
  })

  it('should cover every fa/en pair in a screenshot and a testimonial row', () => {
    // These are per-row, so emptyProduct() has none of them to walk — the row
    // templates are the shape.
    expect(findPairs(EMPTY_SCREENSHOT).filter(p => !TRANSLATABLE_SCREENSHOT.includes(p))).toEqual([])
    expect(findPairs(EMPTY_TESTIMONIAL).filter(p => !TRANSLATABLE_TESTIMONIAL.includes(p))).toEqual([])
  })

  it('should list only paths that exist on a product', () => {
    // A stale entry is the other failure mode: the button renders, reads undefined,
    // and is permanently disabled with no explanation.
    const product = emptyProduct()
    const at = p => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), product)

    for (const base of TRANSLATABLE_TEXTS) {
      expect(typeof at(`${base}.fa`)).toBe('string')
    }
    for (const base of TRANSLATABLE_LISTS) {
      expect(Array.isArray(at(`${base}.fa`))).toBe(true)
    }
  })

  it('should keep the form batch size within what the route accepts', () => {
    // The form chunks its bulk pass; the route rejects an over-long array outright.
    // If these drift apart, a full product's bulk translation fails entirely.
    const source = fs.readFileSync(path.join(process.cwd(), 'src/components/Admin/ProductForm.js'), 'utf8')
    const match = source.match(/const BATCH_SIZE = (\d+)/)
    expect(match).not.toBeNull()
    expect(Number(match[1])).toBeLessThanOrEqual(MAX_BATCH)
  })
})
