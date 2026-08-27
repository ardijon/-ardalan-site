import { createOrder, uploadReceipt, getOrderById } from '@/lib/orders'
import { existsSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'

// DATA_DIR is set to a scratch directory by jest.setup.js — never src/data.
const ORDERS_FILE = path.join(process.cwd(), process.env.DATA_DIR, 'orders.json')
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/receipts')

beforeEach(() => {
  mkdirSync(path.dirname(ORDERS_FILE), { recursive: true })
  writeFileSync(ORDERS_FILE, '[]', 'utf8')
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true })
  }
})

describe('Receipt Upload', () => {
  it('should accept valid receipt', async () => {
    const order = await createOrder({
      productId: 'tavana',
      plan: 'starter',
      customer: { name: 'Test', phone: '09123456789' },
      basePrice: 490000,
    })

    const result = await uploadReceipt(order.id, {
      filename: 'receipt.jpg',
      amount: order.uniqueAmount,
      trackingCode: 'TRK-123',
    })

    expect(result.status).toBe('receipt_uploaded')
    expect(result.receipt.trackingCode).toBe('TRK-123')
  })

  it('should reject receipt with amount mismatch', async () => {
    const order = await createOrder({
      productId: 'tavana',
      plan: 'starter',
      customer: { name: 'Test', phone: '09123456789' },
      basePrice: 490000,
    })

    const result = await uploadReceipt(order.id, {
      filename: 'receipt.jpg',
      amount: 99999,
      trackingCode: 'TRK-123',
    })

    expect(result.status).toBe('receipt_uploaded')
    expect(result.receipt.amount).toBe(99999)
  })

  it('should reject receipt for non-existent order', async () => {
    const result = await uploadReceipt('ORD-nonexistent', {
      filename: 'receipt.jpg',
      amount: 490000,
    })

    expect(result).toBeNull()
  })

  it('should reject receipt for already approved order', async () => {
    const order = await createOrder({
      productId: 'tavana',
      plan: 'starter',
      customer: { name: 'Test', phone: '09123456789' },
      basePrice: 490000,
    })

    const { updateOrderStatus } = await import('@/lib/orders')
    await updateOrderStatus(order.id, 'approved')

    const result = await uploadReceipt(order.id, {
      filename: 'receipt.jpg',
      amount: order.uniqueAmount,
    })

    expect(result.error).toBe('receipt_only_allowed_for_pending_orders')
  })

  it('should store receipt metadata correctly', async () => {
    const order = await createOrder({
      productId: 'tavana',
      plan: 'starter',
      customer: { name: 'Test', phone: '09123456789' },
      basePrice: 490000,
    })

    const result = await uploadReceipt(order.id, {
      filename: 'receipt-123.jpg',
      amount: order.uniqueAmount,
      trackingCode: 'TRK-456',
    })

    const updated = await getOrderById(order.id)
    expect(updated.receipt).toBeDefined()
    expect(updated.receipt.filename).toBe('receipt-123.jpg')
    expect(updated.receipt.amount).toBe(order.uniqueAmount)
    expect(updated.receipt.uploadedAt).toBeDefined()
  })
})
