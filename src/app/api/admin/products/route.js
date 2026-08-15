import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'src/data/products.json')

// Rate limiting for failed admin login attempts only
const loginAttempts = new Map()
const MAX_ATTEMPTS = 5
const LOCKOUT_TIME = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(ip) {
  const now = Date.now()
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 }

  if (now - attempts.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.set(ip, { count: 0, lastAttempt: now })
    return true
  }

  if (attempts.count >= MAX_ATTEMPTS) {
    return false
  }

  return true
}

function recordFailedAttempt(ip) {
  const now = Date.now()
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 }

  if (now - attempts.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
  } else {
    loginAttempts.set(ip, { count: attempts.count + 1, lastAttempt: now })
  }
}

function resetAttempts(ip) {
  loginAttempts.delete(ip)
}

async function readProducts() {
  const data = await readFile(DATA_PATH, 'utf-8')
  return JSON.parse(data)
}

async function writeProducts(products) {
  await writeFile(DATA_PATH, JSON.stringify(products, null, 2), 'utf-8')
}

function checkAuth(request) {
  const auth = request.headers.get('authorization')
  if (!auth || !auth.startsWith('Basic ')) return false
  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString()
  const [user, pass] = decoded.split(':')
  return user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return '127.0.0.1'
}

function checkCsrf(request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false
  try {
    const originHost = new URL(origin).host
    if (process.env.NODE_ENV === 'production' && new URL(origin).protocol !== 'https:') {
      return false
    }
    return originHost === host
  } catch {
    return false
  }
}

function validateProduct(product) {
  if (!product || typeof product !== 'object') return false
  if (!product.slug || typeof product.slug !== 'string') return false
  if (!product.title || typeof product.title !== 'object') return false
  if (!product.pricing || typeof product.pricing !== 'object') return false
  if (!product.shortDescription || typeof product.shortDescription !== 'object') return false
  return true
}

export async function GET(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const products = await readProducts()
    return NextResponse.json(products)
  } catch (error) {
    console.error('Failed to read products:', error)
    return NextResponse.json({ error: 'Failed to read products' }, { status: 500 })
  }
}

export async function POST(request) {
  // CSRF protection first
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // Rate limit check BEFORE authentication
  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  // Authentication check - only increment on failure
  if (!checkAuth(request)) {
    recordFailedAttempt(ip)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Auth succeeded - reset attempts
  resetAttempts(ip)

  try {
    const newProduct = await request.json()

    if (!validateProduct(newProduct)) {
      return NextResponse.json({ error: 'Invalid product data' }, { status: 400 })
    }

    const products = await readProducts()

    if (products.find(p => p.slug === newProduct.slug)) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
    }

    products.push(newProduct)
    await writeProducts(products)
    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error('Failed to create product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

export async function PUT(request) {
  // CSRF protection first
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // Rate limit check BEFORE authentication
  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  // Authentication check - only increment on failure
  if (!checkAuth(request)) {
    recordFailedAttempt(ip)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Auth succeeded - reset attempts
  resetAttempts(ip)

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

    products[index] = updated
    await writeProducts(products)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(request) {
  // CSRF protection first
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // Rate limit check BEFORE authentication
  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  // Authentication check - only increment on failure
  if (!checkAuth(request)) {
    recordFailedAttempt(ip)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Auth succeeded - reset attempts
  resetAttempts(ip)

  try {
    const { slug } = await request.json()
    const products = await readProducts()
    const filtered = products.filter(p => p.slug !== slug)

    if (filtered.length === products.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await writeProducts(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
