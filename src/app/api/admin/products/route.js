import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import bundledProducts from '@/data/products.json'
import { readCollection, writeCollection } from '@/lib/storage'
import { guardAdminRoute } from '@/lib/admin-auth'
import { recordAudit, auditSummary } from '@/lib/audit'

/**
 * Product CRUD for the admin panel.
 *
 * Reads and writes go through the storage layer instead of fs, because on
 * Cloudflare Workers `writeFile` does not persist and `src/data/products.json`
 * is not present at the path `process.cwd()` resolves to — every request here
 * failed with a 500 in production.
 *
 * When storage is empty (first run, or before the KV namespace is created) we
 * fall back to the JSON bundled at build time, so the panel always shows the
 * real catalogue rather than an empty list.
 */

const COLLECTION = 'products'

async function readProducts() {
  const stored = await readCollection(COLLECTION, null)
  if (Array.isArray(stored) && stored.length > 0) return stored
  return bundledProducts
}

async function writeProducts(products) {
  await writeCollection(COLLECTION, products)

  // The public store pages are prerendered from the catalogue, so without this
  // an admin edit would not appear until the next deploy.
  try {
    revalidatePath('/store')
    revalidatePath('/store/[slug]', 'page')
    revalidatePath('/sitemap.xml')
  } catch (error) {
    // Revalidation is best-effort — never fail the write because of it.
    console.error('[products] revalidate failed:', error)
  }
}

function validateProduct(product) {
  if (!product || typeof product !== 'object') return false
  if (!product.slug || typeof product.slug !== 'string') return false
  // Slug ends up in URLs and on disk paths — keep it strict.
  if (!/^[a-z0-9-]+$/i.test(product.slug)) return false
  if (!product.title || typeof product.title !== 'object') return false
  if (!product.pricing || typeof product.pricing !== 'object') return false
  if (!product.shortDescription || typeof product.shortDescription !== 'object') return false
  return true
}

export async function GET(request) {
  const denied = await guardAdminRoute(request)
  if (denied) return denied

  try {
    const products = await readProducts()
    return NextResponse.json(products)
  } catch (error) {
    console.error('Failed to read products:', error)
    return NextResponse.json({ error: 'Failed to read products' }, { status: 500 })
  }
}

export async function POST(request) {
  const denied = await guardAdminRoute(request, { mutating: true })
  if (denied) return denied

  try {
    const newProduct = await request.json()

    if (!validateProduct(newProduct)) {
      return NextResponse.json({ error: 'Invalid product data' }, { status: 400 })
    }

    const products = await readProducts()

    if (products.find(p => p.slug === newProduct.slug)) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
    }

    await writeProducts([...products, newProduct])

    // Audited in the route rather than in a lib the way orders are, because there is
    // no product lib — the handlers are the only writers. Always after the write:
    // a log entry for a save that then failed is worse than no entry at all.
    await recordAudit({
      action: 'product.create',
      entityId: newProduct.slug,
      summary: auditSummary.product('محصول جدید', newProduct),
    })

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error('Failed to create product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

export async function PUT(request) {
  const denied = await guardAdminRoute(request, { mutating: true })
  if (denied) return denied

  try {
    const updated = await request.json()

    if (!validateProduct(updated)) {
      return NextResponse.json({ error: 'Invalid product data' }, { status: 400 })
    }

    const products = await readProducts()
    const index = products.findIndex(p => p.slug === updated.slug)

    if (index === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const next = [...products]
    next[index] = updated
    await writeProducts(next)

    await recordAudit({
      action: 'product.update',
      entityId: updated.slug,
      summary: auditSummary.product('ویرایش', updated),
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(request) {
  const denied = await guardAdminRoute(request, { mutating: true })
  if (denied) return denied

  try {
    const { slug } = await request.json()
    const products = await readProducts()
    // Kept before the filter: after the delete the title is gone, and a log row
    // that says حذف «insurance-recruit» is a slug, not the thing you deleted.
    const removed = products.find(p => p.slug === slug)
    const filtered = products.filter(p => p.slug !== slug)

    if (filtered.length === products.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await writeProducts(filtered)

    await recordAudit({
      action: 'product.delete',
      entityId: slug,
      summary: auditSummary.product('حذف', removed),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
