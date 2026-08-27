import bundledProducts from '@/data/products.json'
import { readCollection } from '@/lib/storage'

/**
 * Product catalogue — live data. SERVER ONLY.
 *
 * Import this from server components and route handlers only. It reaches the
 * storage layer, which touches `fs` in local development; importing it from a
 * client component breaks the build.
 * Client-safe build-time data lives in `@/lib/products.js`.
 *
 * Returns whatever the admin panel last saved, falling back to the JSON bundled
 * at build time when storage is empty or unavailable. That fallback is what
 * makes this safe to use during prerendering and before the KV namespace is
 * provisioned: the result is then identical to the build-time catalogue.
 */

export async function getLiveProducts() {
  try {
    const stored = await readCollection('products', null)
    if (Array.isArray(stored) && stored.length > 0) return stored
  } catch (error) {
    console.error('[products] live read failed, using bundled data:', error)
  }
  return bundledProducts
}

export async function getLiveProduct(slug) {
  const all = await getLiveProducts()
  return all.find(p => p.slug === slug)
}
