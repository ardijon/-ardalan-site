import { NextResponse } from 'next/server'
import { getLiveProducts } from '@/lib/products-server'

/**
 * Public catalogue summary for the landing page.
 *
 * The page itself now server-renders the ladder, so this is no longer the only
 * way the `#products` section can see a product added from the admin panel — it
 * is the refresh path. The server render is a snapshot of request time; this
 * route is what lets the section pick up a KV edit without a new deploy, and
 * what the client falls back to if the initial payload is ever missing.
 *
 * Deliberately a projection, not the whole document: Tavana alone carries 23
 * screenshots plus a five-paragraph value proposition, none of which a
 * three-line summary card renders. Sending them would make the landing page pay
 * for data it throws away.
 */
function summarize(product) {
  return {
    slug: product.slug,
    status: product.status || 'available',
    featured: Boolean(product.featured),
    tier: product.tier ?? 99,
    audience: product.audience || null,
    shortTitle: product.shortTitle || product.title || null,
    shortDescription: product.shortDescription || null,
    pricingMode: product.pricingMode || 'fixed',
    priceSummary: product.priceSummary || null,
    releaseAt: product.releaseAt || null,
    // Only the two fields the price line reads, not the whole plan.
    pricing: {
      starter: product.pricing?.starter
        ? { priceDisplay: product.pricing.starter.priceDisplay, period: product.pricing.starter.period }
        : undefined,
      pro: product.pricing?.pro
        ? { priceDisplay: product.pricing.pro.priceDisplay, period: product.pricing.pro.period }
        : undefined,
    },
  }
}

export async function GET() {
  const products = await getLiveProducts()

  return NextResponse.json(
    { products: products.map(summarize) },
    {
      // Short public cache: the catalogue changes rarely, and a stale minute on
      // the landing summary costs nothing while /store stays authoritative.
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    }
  )
}
