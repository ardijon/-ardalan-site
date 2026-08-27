import bundledProducts from '@/data/products.json'

/**
 * Product catalogue — build-time data, safe to import anywhere.
 *
 * This module must stay free of server-only dependencies. It is imported by
 * client components (Store/ProductClient, Store/OrderTracker) and by
 * generateStaticParams, so pulling the storage layer in here made webpack try
 * to bundle `fs/promises` for the browser and the build failed outright.
 *
 * For data that reflects the admin panel's latest saves, use
 * `@/lib/products-server` instead — server components and route handlers only.
 */

const products = bundledProducts

export function getProduct(slug) {
  return products.find(p => p.slug === slug)
}

export function getAllProducts() {
  return products
}

export default products
