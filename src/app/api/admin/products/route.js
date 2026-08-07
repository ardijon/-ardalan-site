import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'src/data/products.json')

// Rate limiting for admin login
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

  loginAttempts.set(ip, { count: attempts.count + 1, lastAttempt: now })
  return true
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

export async function GET(request) {
  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const products = await readProducts()
    return NextResponse.json(products)
  } catch {
    return NextResponse.json({ error: 'Failed to read products' }, { status: 500 })
  }
}

export async function POST(request) {
  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const newProduct = await request.json()
    const products = await readProducts()

    if (products.find(p => p.slug === newProduct.slug)) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
    }

    products.push(newProduct)
    await writeProducts(products)
    return NextResponse.json(newProduct, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

export async function PUT(request) {
  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const updated = await request.json()
    const products = await readProducts()
    const index = products.findIndex(p => p.slug === updated.slug)

    if (index === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    products[index] = updated
    await writeProducts(products)
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(request) {
  const ip = getClientIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { slug } = await request.json()
    const products = await readProducts()
    const filtered = products.filter(p => p.slug !== slug)

    if (filtered.length === products.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await writeProducts(filtered)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
