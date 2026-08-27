/**
 * Covers the storage layer receipts actually go through.
 *
 * The bug these tests exist for: receipts were written with fs.writeFile, which
 * on Cloudflare Workers returns success and stores nothing. The upload answered
 * 200, the order moved to `receipt_uploaded`, and the admin then saw «تصویر رسید
 * موجود نیست» with no way to check the payment. So the thing worth testing is
 * not "does put resolve" but "does a blob written through one driver come back
 * out of that same driver, byte for byte".
 *
 * Each driver is exercised against a stub binding shaped like the real one.
 * blob.js caches its driver in a module-level promise — deliberately, since the
 * binding cannot change mid-process — so every test loads the module in a fresh
 * registry with jest.resetModules() and a doMock of @opennextjs/cloudflare.
 */

import path from 'path'
import { mkdirSync, rmSync, existsSync } from 'fs'

/** Minimal stand-in for a KV namespace binding. */
function fakeKv() {
  const store = new Map()
  return {
    store,
    async put(key, value, options = {}) {
      // KV copies the bytes; keeping a copy here catches code that hands over a
      // buffer it later mutates or detaches.
      store.set(key, { value: new Uint8Array(toBytes(value)), metadata: options.metadata })
    },
    async getWithMetadata(key) {
      const hit = store.get(key)
      if (!hit) return { value: null, metadata: null }
      return { value: hit.value.buffer, metadata: hit.metadata }
    },
    async delete(key) {
      store.delete(key)
    },
  }
}

/** Minimal stand-in for an R2 bucket binding. */
function fakeR2() {
  const store = new Map()
  return {
    store,
    async put(key, value, options = {}) {
      store.set(key, { value: new Uint8Array(toBytes(value)), httpMetadata: options.httpMetadata })
    },
    async get(key) {
      const hit = store.get(key)
      if (!hit) return null
      return { body: hit.value.buffer, httpMetadata: hit.httpMetadata }
    },
    async delete(key) {
      store.delete(key)
    },
  }
}

function toBytes(value) {
  return value instanceof ArrayBuffer ? value : new Uint8Array(value).buffer
}

/**
 * Load a fresh copy of blob.js bound to the given env. Passing null means the
 * Cloudflare import throws, which is what happens off Workers.
 */
async function loadBlob(env) {
  jest.resetModules()
  jest.doMock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: async () => {
      if (env === null) throw new Error('not running on Workers')
      return { env }
    },
  }))
  return import('@/lib/blob')
}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02])

function bytesOf(body) {
  return new Uint8Array(body instanceof ArrayBuffer ? body : body.buffer ?? body)
}

afterEach(() => {
  jest.resetModules()
  jest.dontMock('@opennextjs/cloudflare')
})

describe('blob storage — driver selection', () => {
  it('prefers R2 when the RECEIPTS binding exists', async () => {
    const blob = await loadBlob({ RECEIPTS: fakeR2(), SITE_KV: fakeKv() })
    expect(await blob.blobDriver()).toBe('r2')
    expect(await blob.hasBlobStorage()).toBe(true)
  })

  it('falls back to KV when only SITE_KV exists', async () => {
    const blob = await loadBlob({ SITE_KV: fakeKv() })
    expect(await blob.blobDriver()).toBe('kv')
    expect(await blob.hasBlobStorage()).toBe(true)
  })

  it('falls back to the filesystem off Workers', async () => {
    const blob = await loadBlob(null)
    expect(await blob.blobDriver()).toBe('file')
    // The whole point of hasBlobStorage: on Workers the file driver would be a
    // silent data-loss path, so callers can tell the difference.
    expect(await blob.hasBlobStorage()).toBe(false)
  })

  it('falls back to the filesystem when Workers has no storage binding', async () => {
    const blob = await loadBlob({})
    expect(await blob.blobDriver()).toBe('file')
  })
})

describe('blob storage — KV driver (current production path)', () => {
  it('round-trips the exact bytes and the content type', async () => {
    const kv = fakeKv()
    const blob = await loadBlob({ SITE_KV: kv })

    await blob.putBlob('receipt-ORD-1-2.png', PNG_BYTES, { contentType: 'image/png' })
    const got = await blob.getBlob('receipt-ORD-1-2.png')

    expect(got).not.toBeNull()
    expect(bytesOf(got.body)).toEqual(PNG_BYTES)
    expect(got.contentType).toBe('image/png')
  })

  it('namespaces keys under receipts/ so other blob kinds can share the namespace', async () => {
    const kv = fakeKv()
    const blob = await loadBlob({ SITE_KV: kv })

    await blob.putBlob('receipt-ORD-1-2.png', PNG_BYTES)

    expect([...kv.store.keys()]).toEqual(['receipts/receipt-ORD-1-2.png'])
  })

  it('infers the content type from the extension when the client sends none', async () => {
    const blob = await loadBlob({ SITE_KV: fakeKv() })

    await blob.putBlob('receipt-ORD-1-2.webp', PNG_BYTES)

    expect((await blob.getBlob('receipt-ORD-1-2.webp')).contentType).toBe('image/webp')
  })

  it('returns null for a blob that was never stored', async () => {
    const blob = await loadBlob({ SITE_KV: fakeKv() })
    // Not an error: the serving route turns this into a 404 rather than a
    // broken image.
    expect(await blob.getBlob('receipt-missing-1.png')).toBeNull()
  })

  it('deletes, and treats a missing blob as already deleted', async () => {
    const kv = fakeKv()
    const blob = await loadBlob({ SITE_KV: kv })

    await blob.putBlob('receipt-ORD-1-2.png', PNG_BYTES)
    await blob.deleteBlob('receipt-ORD-1-2.png')

    expect(await blob.getBlob('receipt-ORD-1-2.png')).toBeNull()
    await expect(blob.deleteBlob('receipt-ORD-1-2.png')).resolves.toBeUndefined()
  })
})

describe('blob storage — R2 driver', () => {
  it('round-trips bytes and content type through httpMetadata', async () => {
    const bucket = fakeR2()
    const blob = await loadBlob({ RECEIPTS: bucket })

    await blob.putBlob('receipt-ORD-9-9.jpg', PNG_BYTES, { contentType: 'image/jpeg' })
    const got = await blob.getBlob('receipt-ORD-9-9.jpg')

    expect(bytesOf(got.body)).toEqual(PNG_BYTES)
    expect(got.contentType).toBe('image/jpeg')
    expect(bucket.store.has('receipts/receipt-ORD-9-9.jpg')).toBe(true)
  })

  it('returns null for a missing object', async () => {
    const blob = await loadBlob({ RECEIPTS: fakeR2() })
    expect(await blob.getBlob('receipt-nope-1.jpg')).toBeNull()
  })
})

describe('blob storage — file driver', () => {
  // Scratch dir under the project, not os.tmpdir(): on Windows the temp dir can
  // sit on a different drive than the repo, and UPLOAD_DIR is resolved relative
  // to cwd, so a C:\ temp path would be joined onto a D:\ cwd and fail.
  const DIR = path.join('.jest-data', `blob-${process.env.JEST_WORKER_ID || '1'}`)
  const ABS = path.join(process.cwd(), DIR)
  let previousUploadDir

  beforeEach(() => {
    rmSync(ABS, { recursive: true, force: true })
    mkdirSync(ABS, { recursive: true })
    previousUploadDir = process.env.UPLOAD_DIR
    process.env.UPLOAD_DIR = DIR
  })

  afterEach(() => {
    if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR
    else process.env.UPLOAD_DIR = previousUploadDir
    rmSync(ABS, { recursive: true, force: true })
  })

  it('writes, reads back and deletes a real file', async () => {
    const blob = await loadBlob(null)

    await blob.putBlob('receipt-ORD-1-2.png', PNG_BYTES, { contentType: 'image/png' })
    const target = path.join(ABS, 'receipt-ORD-1-2.png')
    expect(existsSync(target)).toBe(true)

    const got = await blob.getBlob('receipt-ORD-1-2.png')
    expect(bytesOf(got.body)).toEqual(PNG_BYTES)
    expect(got.contentType).toBe('image/png')

    await blob.deleteBlob('receipt-ORD-1-2.png')
    expect(existsSync(target)).toBe(false)
  })

  it('creates the upload directory if it does not exist yet', async () => {
    process.env.UPLOAD_DIR = path.join(DIR, 'nested', 'deeper')
    const blob = await loadBlob(null)

    await blob.putBlob('receipt-ORD-3-4.png', PNG_BYTES)

    expect(existsSync(path.join(ABS, 'nested', 'deeper', 'receipt-ORD-3-4.png'))).toBe(true)
  })

  it('returns null instead of throwing when the file is absent', async () => {
    const blob = await loadBlob(null)
    expect(await blob.getBlob('receipt-absent-1.png')).toBeNull()
  })
})

describe('blob storage — name validation', () => {
  // The file driver joins the name onto a directory path, so a traversal here
  // would read or overwrite an arbitrary file. Validation lives in blob.js
  // rather than being trusted from the callers.
  const REJECTED = [
    ['a path segment', 'a/b.png'],
    ['a backslash segment', 'a\\b.png'],
    ['parent traversal', '../secret.png'],
    ['traversal mid-name', 'receipt-..-1.png'],
    ['an absolute path', '/etc/passwd'],
    ['a leading dot', '.env'],
    ['a leading dash', '-rf.png'],
    ['an empty name', ''],
    ['a non-string', 123],
    ['a name over 128 chars', `${'a'.repeat(129)}.png`],
  ]

  it.each(REJECTED)('rejects %s on write', async (_label, name) => {
    const kv = fakeKv()
    const blob = await loadBlob({ SITE_KV: kv })

    await expect(blob.putBlob(name, PNG_BYTES)).rejects.toThrow('unsafe blob name')
    expect(kv.store.size).toBe(0)
  })

  it.each(REJECTED)('rejects %s on read', async (_label, name) => {
    const blob = await loadBlob({ SITE_KV: fakeKv() })
    await expect(blob.getBlob(name)).rejects.toThrow('unsafe blob name')
  })

  it.each(REJECTED)('rejects %s on delete', async (_label, name) => {
    const blob = await loadBlob({ SITE_KV: fakeKv() })
    await expect(blob.deleteBlob(name)).rejects.toThrow('unsafe blob name')
  })

  it('accepts the names the upload route actually generates', async () => {
    const blob = await loadBlob({ SITE_KV: fakeKv() })

    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      const name = `receipt-ORD-1787287937386-D25948-1787288589394.${ext}`
      await expect(blob.putBlob(name, PNG_BYTES)).resolves.toBeUndefined()
    }
  })
})
