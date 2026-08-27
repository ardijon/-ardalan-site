/**
 * Covers the two HTTP routes on the payment path: the customer's receipt upload
 * and the admin's receipt view.
 *
 * These exist because the upload used to succeed while storing nothing. The
 * route returned 200, the order advanced to `receipt_uploaded`, and the admin
 * then had no image to check the transfer against — payment could not be
 * verified at all. A green "returns 200" assertion would have passed the whole
 * time, so every success case here also reads the blob back out.
 *
 * The blob binding is a stub shaped like a real R2 bucket. SITE_KV is left
 * unbound on purpose, so src/lib/storage.js uses its file driver against the
 * scratch DATA_DIR that jest.setup.js provides — orders behave exactly as in the
 * other suites, while receipts go through a Workers-shaped binding.
 */

import path from 'path'
import { mkdirSync, writeFileSync } from 'fs'

const ORDERS_FILE = path.join(process.cwd(), process.env.DATA_DIR, 'orders.json')

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02])

/** Minimal stand-in for an R2 bucket binding. */
function fakeR2() {
  const store = new Map()
  return {
    store,
    async put(key, value, options = {}) {
      const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value)
      store.set(key, { value: bytes, httpMetadata: options.httpMetadata })
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

/**
 * Load the routes in a fresh module registry sharing one blob instance, so a
 * receipt written by the upload route is readable by the serving route — the
 * exact handoff that was broken in production.
 *
 * @param {{ authenticated?: boolean }} [options]
 */
async function loadRoutes({ authenticated = true } = {}) {
  jest.resetModules()

  const bucket = fakeR2()
  jest.doMock('@opennextjs/cloudflare', () => ({
    getCloudflareContext: async () => ({ env: { RECEIPTS: bucket } }),
  }))

  // The session cookie is HMAC-signed with a server secret, so the guard is
  // stubbed rather than forged. admin.test.js covers the guard itself.
  jest.doMock('@/lib/admin-auth', () => {
    const { NextResponse } = require('next/server')
    return {
      guardAdminRoute: async () =>
        authenticated ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  })

  const orders = await import('@/lib/orders')
  const upload = await import('@/app/api/orders/[id]/receipt/route')
  const serve = await import('@/app/api/admin/receipt/[filename]/route')

  return { bucket, orders, upload, serve }
}

/** A pending order the upload route will accept a receipt for. */
async function pendingOrder(orders) {
  return orders.createOrder({
    productId: 'tavana',
    plan: 'starter',
    customer: { name: 'Test', phone: '09123456789' },
    basePrice: 490000,
  })
}

function uploadRequest(fields = {}) {
  const body = new FormData()
  const {
    receipt = new File([PNG_BYTES], 'slip.png', { type: 'image/png' }),
    amount,
    trackingCode,
  } = fields

  if (receipt !== null) body.append('receipt', receipt)
  if (amount !== undefined) body.append('amount', String(amount))
  if (trackingCode !== undefined) body.append('trackingCode', trackingCode)

  return new Request('https://ai2apps.sbs/api/orders/x/receipt', { method: 'POST', body })
}

function params(value) {
  return { params: Promise.resolve(value) }
}

beforeEach(() => {
  mkdirSync(path.dirname(ORDERS_FILE), { recursive: true })
  writeFileSync(ORDERS_FILE, '[]', 'utf8')
})

afterEach(() => {
  jest.resetModules()
  jest.dontMock('@opennextjs/cloudflare')
  jest.dontMock('@/lib/admin-auth')
})

describe('POST /api/orders/[id]/receipt', () => {
  it('stores the bytes durably and reports the filename', async () => {
    const { bucket, orders, upload } = await loadRoutes()
    const order = await pendingOrder(orders)

    const res = await upload.POST(
      uploadRequest({ amount: order.uniqueAmount, trackingCode: 'TRK-1' }),
      params({ id: order.id })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.filename).toMatch(/^receipt-.+\.png$/)

    // The assertion the original bug would have failed: the object is really there.
    const stored = bucket.store.get(`receipts/${json.filename}`)
    expect(stored).toBeDefined()
    expect(new Uint8Array(stored.value)).toEqual(PNG_BYTES)
    expect(stored.httpMetadata.contentType).toBe('image/png')

    const updated = await orders.getOrderById(order.id)
    expect(updated.status).toBe('receipt_uploaded')
    expect(updated.receipt.filename).toBe(json.filename)
    expect(updated.receipt.trackingCode).toBe('TRK-1')
  })

  it('answers 400 rather than 500 when the request has no body', async () => {
    // formData() throws here. Letting that reach the catch block reported a 500
    // «خطا در آپلود رسید», which reads as the server being down.
    const { orders, upload } = await loadRoutes()
    const order = await pendingOrder(orders)

    const res = await upload.POST(
      new Request('https://ai2apps.sbs/api/orders/x/receipt', { method: 'POST' }),
      params({ id: order.id })
    )

    expect(res.status).toBe(400)
  })

  it('rejects an order id that is not in the expected format', async () => {
    const { upload } = await loadRoutes()

    const res = await upload.POST(uploadRequest(), params({ id: '../../etc/passwd' }))

    expect(res.status).toBe(400)
  })

  it('returns 404 for an order that does not exist', async () => {
    const { upload } = await loadRoutes()

    const res = await upload.POST(uploadRequest(), params({ id: 'ORD-does-not-exist' }))

    expect(res.status).toBe(404)
  })

  it('refuses a second receipt once the order has moved on', async () => {
    const { upload, orders } = await loadRoutes()
    const order = await pendingOrder(orders)
    await orders.updateOrderStatus(order.id, 'approved')

    const res = await upload.POST(uploadRequest(), params({ id: order.id }))

    expect(res.status).toBe(400)
  })

  it('requires a file', async () => {
    const { upload, orders } = await loadRoutes()
    const order = await pendingOrder(orders)

    const res = await upload.POST(uploadRequest({ receipt: null }), params({ id: order.id }))

    expect(res.status).toBe(400)
  })

  it('rejects a non-image upload and stores nothing', async () => {
    const { bucket, upload, orders } = await loadRoutes()
    const order = await pendingOrder(orders)

    const res = await upload.POST(
      uploadRequest({ receipt: new File(['#!/bin/sh'], 'x.sh', { type: 'text/x-sh' }) }),
      params({ id: order.id })
    )

    expect(res.status).toBe(400)
    expect(bucket.store.size).toBe(0)
  })

  it('rejects a file over 5MB and stores nothing', async () => {
    const { bucket, upload, orders } = await loadRoutes()
    const order = await pendingOrder(orders)

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    const res = await upload.POST(uploadRequest({ receipt: big }), params({ id: order.id }))

    expect(res.status).toBe(400)
    expect(bucket.store.size).toBe(0)
  })

  it('never stores the extension the client sent', async () => {
    // A .php or .html suffix on an image would be stored verbatim by the old code.
    const { bucket, upload, orders } = await loadRoutes()
    const order = await pendingOrder(orders)

    const res = await upload.POST(
      uploadRequest({ receipt: new File([PNG_BYTES], 'slip.php', { type: 'image/png' }) }),
      params({ id: order.id })
    )
    const { filename } = await res.json()

    expect(filename.endsWith('.jpg')).toBe(true)
    expect([...bucket.store.keys()][0]).toBe(`receipts/${filename}`)
  })
})

describe('GET /api/admin/receipt/[filename]', () => {
  it('serves the uploaded receipt back to a logged-in admin', async () => {
    const { orders, upload, serve } = await loadRoutes()
    const order = await pendingOrder(orders)
    const { filename } = await (
      await upload.POST(uploadRequest(), params({ id: order.id }))
    ).json()

    const res = await serve.GET(
      new Request(`https://ai2apps.sbs/api/admin/receipt/${filename}`),
      params({ filename })
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG_BYTES)
  })

  it('never lets a shared cache keep a bank slip', async () => {
    const { orders, upload, serve } = await loadRoutes()
    const order = await pendingOrder(orders)
    const { filename } = await (
      await upload.POST(uploadRequest(), params({ id: order.id }))
    ).json()

    const res = await serve.GET(
      new Request(`https://ai2apps.sbs/api/admin/receipt/${filename}`),
      params({ filename })
    )

    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('requires an admin session', async () => {
    // Receipts used to be public static files under /uploads/receipts/, with a
    // filename derived from the order id the customer is given plus a timestamp.
    const { orders, upload, serve } = await loadRoutes({ authenticated: true })
    const order = await pendingOrder(orders)
    const { filename } = await (
      await upload.POST(uploadRequest(), params({ id: order.id }))
    ).json()

    const anonymous = await loadRoutes({ authenticated: false })
    const res = await anonymous.serve.GET(
      new Request(`https://ai2apps.sbs/api/admin/receipt/${filename}`),
      params({ filename })
    )

    expect(res.status).toBe(401)
  })

  it('returns 404 for a receipt that was never uploaded', async () => {
    const { serve } = await loadRoutes()

    const res = await serve.GET(
      new Request('https://ai2apps.sbs/api/admin/receipt/receipt-ORD-nope-1.png'),
      params({ filename: 'receipt-ORD-nope-1.png' })
    )

    expect(res.status).toBe(404)
  })

  it.each([
    ['a path traversal', '../../src/data/orders.json'],
    ['an unexpected prefix', 'orders.json'],
    ['a disallowed extension', 'receipt-ORD-1-2.svg'],
    ['no extension', 'receipt-ORD-1-2'],
  ])('rejects %s', async (_label, filename) => {
    const { serve } = await loadRoutes()

    const res = await serve.GET(
      new Request('https://ai2apps.sbs/api/admin/receipt/x'),
      params({ filename })
    )

    expect(res.status).toBe(400)
  })
})
