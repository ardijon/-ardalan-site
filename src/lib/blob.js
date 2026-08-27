/**
 * Binary blob storage with three interchangeable drivers.
 *
 * WHY THIS EXISTS
 * ---------------
 * Payment receipts used to be written straight to public/uploads/receipts/ with
 * `fs.writeFile`. On Cloudflare Workers that cannot work: the filesystem is not
 * writable, and nothing is served out of public/ at runtime that was not there
 * at build time.
 *
 * The failure was silent and expensive. The customer's upload returned 200, the
 * order moved to `receipt_uploaded`, and then the admin opened the receipt
 * viewer and saw «تصویر رسید موجود نیست» — with no way to check the amount
 * against the bank slip. Payment could not be verified, so the money path was
 * effectively closed in production.
 *
 * DRIVERS
 * -------
 *   R2 driver   — used when the RECEIPTS binding is present. The right home for
 *                 images, but R2 has to be switched on in the Cloudflare
 *                 dashboard first (it asks for a payment method even for the
 *                 free tier), and until that happens the API answers
 *                 "Please enable R2" [code: 10042].
 *   KV driver   — used when SITE_KV is present but RECEIPTS is not. This is the
 *                 current production path. KV takes binary values up to 25 MiB
 *                 and uploads are capped at 5 MB, so receipts fit comfortably.
 *                 Trade-offs vs R2: the free tier gives 1 GB of storage and
 *                 1000 writes/day, and KV is eventually consistent, so a fresh
 *                 receipt can take up to a minute to be visible everywhere.
 *                 For a low-volume store whose receipts are reviewed minutes
 *                 later, that is fine.
 *   File driver — used off Workers (next dev, or any plain Node host). Keeps
 *                 writing to public/uploads/receipts/, so local behaviour and
 *                 existing files are unchanged.
 *
 * Switching to R2 later needs no code change: enable R2, uncomment the
 * [[r2_buckets]] block in wrangler.toml, redeploy. Receipts already in KV stay
 * readable only if the KV driver is still reachable, so migrate them first if
 * any real ones exist by then.
 *
 * Every driver is read back through /api/admin/receipt/<filename>, which is
 * session-guarded. That is deliberate: receipts were previously reachable by
 * anyone at /uploads/receipts/<filename>, and the filename is derived from the
 * order id (which the customer knows) plus a timestamp — guessable enough that
 * bank slips should not have been sitting behind it.
 */

const R2_BINDING = 'RECEIPTS'
const KV_BINDING = 'SITE_KV'

// Namespaced inside the bucket / namespace so other blob kinds can be added
// later without colliding with receipt filenames.
const PREFIX = 'receipts/'

const CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

// ------------------------------------------------------------------- drivers

let driverPromise

/**
 * Resolve the storage driver once, preferring R2 over KV over the filesystem.
 */
async function getDriver() {
  if (driverPromise === undefined) {
    driverPromise = (async () => {
      try {
        const { getCloudflareContext } = await import('@opennextjs/cloudflare')
        const ctx = await getCloudflareContext({ async: true })
        const env = ctx?.env
        if (env?.[R2_BINDING]) return { kind: 'r2', bucket: env[R2_BINDING] }
        if (env?.[KV_BINDING]) return { kind: 'kv', kv: env[KV_BINDING] }
      } catch {
        // Not on Workers (or bindings unavailable) — use the file driver.
      }
      return { kind: 'file' }
    })()
  }
  return driverPromise
}

/**
 * Which driver is live. Returns 'r2' | 'kv' | 'file' — useful for diagnostics,
 * because "receipts silently go nowhere" was the original bug and the driver in
 * use is the single most important thing to be able to check.
 */
export async function blobDriver() {
  return (await getDriver()).kind
}

/** True when receipts survive past the current request. */
export async function hasBlobStorage() {
  return (await getDriver()).kind !== 'file'
}

// ---------------------------------------------------------------- file driver

function uploadDir() {
  return process.env.UPLOAD_DIR || 'public/uploads/receipts'
}

async function filePath(name) {
  const path = await import('path')
  return path.join(process.cwd(), uploadDir(), name)
}

// ------------------------------------------------------------------- shared

/**
 * Blob names are flat filenames, never paths. Callers already build them from
 * a validated order id, but this is the single choke point where a traversal
 * attempt would turn into reading or overwriting an arbitrary file, so it is
 * enforced here rather than trusted from above.
 */
function assertSafeName(name) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name) || name.includes('..')) {
    throw new Error('unsafe blob name')
  }
}

function guessContentType(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  return CONTENT_TYPES[ext] || 'application/octet-stream'
}

/**
 * Store a blob.
 *
 * @param {string} name         flat filename, e.g. 'receipt-ORD-1-2.jpg'
 * @param {ArrayBuffer|Uint8Array} bytes
 * @param {{ contentType?: string }} [options]
 */
export async function putBlob(name, bytes, { contentType } = {}) {
  assertSafeName(name)

  const type = contentType || guessContentType(name)
  const driver = await getDriver()

  if (driver.kind === 'r2') {
    await driver.bucket.put(PREFIX + name, bytes, { httpMetadata: { contentType: type } })
    return
  }

  if (driver.kind === 'kv') {
    // KV stores the bytes as-is; the content type rides along in metadata so the
    // serving route does not have to guess from the extension.
    await driver.kv.put(PREFIX + name, bytes, { metadata: { contentType: type } })
    return
  }

  const { writeFile, mkdir } = await import('fs/promises')
  const path = await import('path')
  const target = await filePath(name)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, Buffer.from(bytes))
}

/**
 * Read a blob back.
 *
 * @returns {Promise<{ body: ReadableStream|ArrayBuffer|Buffer, contentType: string }|null>}
 *          null when the blob does not exist — callers turn that into a 404
 *          rather than a broken image.
 */
export async function getBlob(name) {
  assertSafeName(name)

  const driver = await getDriver()

  if (driver.kind === 'r2') {
    const object = await driver.bucket.get(PREFIX + name)
    if (!object) return null
    return {
      body: object.body,
      contentType: object.httpMetadata?.contentType || guessContentType(name),
    }
  }

  if (driver.kind === 'kv') {
    const { value, metadata } = await driver.kv.getWithMetadata(PREFIX + name, {
      type: 'arrayBuffer',
    })
    if (!value) return null
    return { body: value, contentType: metadata?.contentType || guessContentType(name) }
  }

  try {
    const { readFile } = await import('fs/promises')
    return { body: await readFile(await filePath(name)), contentType: guessContentType(name) }
  } catch {
    return null
  }
}

/** Remove a blob. Missing blobs are not an error — this is used for cleanup. */
export async function deleteBlob(name) {
  assertSafeName(name)

  const driver = await getDriver()

  if (driver.kind === 'r2') {
    await driver.bucket.delete(PREFIX + name)
    return
  }

  if (driver.kind === 'kv') {
    await driver.kv.delete(PREFIX + name)
    return
  }

  try {
    const { unlink } = await import('fs/promises')
    await unlink(await filePath(name))
  } catch {
    // Already gone — nothing to clean up.
  }
}
