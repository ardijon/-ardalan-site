/**
 * Durable storage with two interchangeable drivers.
 *
 * WHY THIS EXISTS
 * ---------------
 * This app is deployed to Cloudflare Workers (see wrangler.toml). On Workers:
 *   - the filesystem is not writable, and
 *   - each request may run in a different isolate, so module-level `Map`s and
 *     any file written by one request are invisible to the next.
 *
 * That made three things silently broken in production:
 *   1. `storeOtp()` wrote the login code into one isolate's memory while
 *      `verifyOtp()` read from another — admin login could never succeed.
 *   2. Orders and product edits written to src/data/*.json vanished.
 *   3. products.js used a build-time `import`, so admin edits never appeared on
 *      the public site until the next rebuild.
 *
 * DRIVERS
 * -------
 *   KV driver   — used when the SITE_KV binding is present (production).
 *   File driver — used otherwise (next dev, or any plain Node host). Keeps the
 *                 existing src/data/<name>.json layout, so current data files
 *                 keep working untouched.
 *
 * If SITE_KV is not bound yet, everything falls back to the file driver, which
 * behaves exactly as before. Nothing breaks before the namespace is created.
 */

const KV_BINDING = 'SITE_KV'

// ------------------------------------------------------------------ kv driver

let kvPromise

/** Resolve the KV namespace once, or null when not running on Workers. */
async function getKv() {
  if (kvPromise === undefined) {
    kvPromise = (async () => {
      try {
        const { getCloudflareContext } = await import('@opennextjs/cloudflare')
        const ctx = await getCloudflareContext({ async: true })
        return ctx?.env?.[KV_BINDING] ?? null
      } catch {
        // Not on Workers (or bindings unavailable) — use the file driver.
        return null
      }
    })()
  }
  return kvPromise
}

/** True when durable storage is available. Useful for diagnostics endpoints. */
export async function hasDurableStorage() {
  return (await getKv()) !== null
}

// ---------------------------------------------------------------- file driver

/**
 * Serialises read-modify-write cycles within a single Node process.
 * One lock per collection so unrelated collections do not block each other.
 */
const locks = new Map()

function acquireLock(name) {
  const current = locks.get(name)
  let release
  const next = new Promise(resolve => {
    release = resolve
  })
  locks.set(name, current ? current.then(() => next) : next)
  return { waitFor: current ?? Promise.resolve(), release }
}

/**
 * Where the file driver keeps its JSON. Overridable via DATA_DIR so that the
 * test suite can point at a scratch directory instead of the live data the site
 * serves — jest used to truncate src/data/orders.json on every run.
 */
function dataDir() {
  return process.env.DATA_DIR || 'src/data'
}

async function dataFilePath(name) {
  const path = await import('path')
  // resolve, not join: DATA_DIR is often an ABSOLUTE path outside the repo (on a
  // plain Node host, so that `git pull` cannot overwrite live orders — the data
  // files are committed). path.join would append it to cwd and silently read the
  // wrong directory, reporting zero orders instead of failing.
  return path.resolve(process.cwd(), dataDir(), `${name}.json`)
}

async function fileRead(name, fallback) {
  try {
    const { readFile } = await import('fs/promises')
    const raw = await readFile(await dataFilePath(name), 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function fileWrite(name, value) {
  const { writeFile, mkdir } = await import('fs/promises')
  const path = await import('path')
  const target = await dataFilePath(name)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, JSON.stringify(value, null, 2), 'utf8')
}

// ------------------------------------------------------------- collections

function collectionKey(name) {
  return `collection:${name}`
}

/**
 * Read a JSON collection (an array).
 *
 * @param {string} name          collection name, e.g. 'orders'
 * @param {any[]}  [fallback]    returned when the collection does not exist yet
 */
export async function readCollection(name, fallback = []) {
  const kv = await getKv()
  if (kv) {
    const raw = await kv.get(collectionKey(name))
    if (raw === null || raw === undefined) return fallback
    try {
      return JSON.parse(raw)
    } catch {
      console.error(`[storage] corrupt JSON in KV for "${name}" — using fallback`)
      return fallback
    }
  }
  return fileRead(name, fallback)
}

/** Overwrite a JSON collection. */
export async function writeCollection(name, value) {
  const kv = await getKv()
  if (kv) {
    await kv.put(collectionKey(name), JSON.stringify(value))
    return
  }
  await fileWrite(name, value)
}

/**
 * Read-modify-write a collection. `fn` mutates the array in place (and may
 * return a value, which is passed through to the caller).
 *
 * NOTE ON KV: KV has no compare-and-swap, so two *simultaneous* writers could
 * lose an update. The admin panel is operated by a single person and order
 * writes are seconds apart, so this is acceptable. If concurrent writes ever
 * matter, move `orders` to D1 (SQL, strongly consistent) — only this function
 * would need to change.
 *
 * @param {string} name
 * @param {(items: any[]) => any} fn
 * @param {any[]} [fallback]
 */
export async function mutateCollection(name, fn, fallback = []) {
  const kv = await getKv()

  if (kv) {
    const items = await readCollection(name, fallback)
    const result = fn(items)
    await writeCollection(name, items)
    return result
  }

  // File driver: serialise so concurrent requests cannot clobber each other.
  const { waitFor, release } = acquireLock(name)
  await waitFor
  try {
    const items = await fileRead(name, fallback)
    const result = fn(items)
    await fileWrite(name, items)
    return result
  } finally {
    release()
  }
}

// --------------------------------------------------------------- documents

/**
 * Short-lived single documents (OTP codes, etc.).
 *
 * KV supports native TTL. The in-memory fallback expires lazily on read, which
 * is fine for a single-process dev server.
 */
const memoryDocs = new Map()

export async function getDoc(key) {
  const kv = await getKv()
  if (kv) {
    const raw = await kv.get(key)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const entry = memoryDocs.get(key)
  if (!entry) return null
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryDocs.delete(key)
    return null
  }
  return entry.value
}

/**
 * @param {string} key
 * @param {any} value
 * @param {{ ttlSeconds?: number }} [options]
 */
export async function putDoc(key, value, { ttlSeconds } = {}) {
  const kv = await getKv()
  if (kv) {
    const options = {}
    // Cloudflare KV rejects a TTL below 60 seconds.
    if (ttlSeconds) options.expirationTtl = Math.max(60, Math.ceil(ttlSeconds))
    await kv.put(key, JSON.stringify(value), options)
    return
  }

  memoryDocs.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  })
}

export async function deleteDoc(key) {
  const kv = await getKv()
  if (kv) {
    await kv.delete(key)
    return
  }
  memoryDocs.delete(key)
}
