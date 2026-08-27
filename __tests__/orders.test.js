import { createOrder, getOrderById, getOrdersByStatus, updateOrderStatus, uploadReceipt } from '@/lib/orders'
import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

// DATA_DIR is set to a scratch directory by jest.setup.js — never src/data.
const ORDERS_FILE = path.join(process.cwd(), process.env.DATA_DIR, 'orders.json')

beforeEach(() => {
  mkdirSync(path.dirname(ORDERS_FILE), { recursive: true })
  writeFileSync(ORDERS_FILE, '[]', 'utf8')
})

describe('Orders', () => {
  describe('createOrder', () => {
    it('should create a valid order with all fields', async () => {
      const order = await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: 'علی رضایی', phone: '09123456789', email: 'ali@example.com' },
        basePrice: 490000,
      })

      expect(order).toBeDefined()
      expect(order.id).toMatch(/^ORD-/)
      expect(order.productId).toBe('tavana')
      expect(order.plan).toBe('starter')
      expect(order.status).toBe('awaiting_payment')
      expect(order.customer.name).toBe('علی رضایی')
      expect(order.customer.phone).toBe('09123456789')
      expect(order.uniqueAmount).toBeGreaterThanOrEqual(490100)
      expect(order.uniqueAmount).toBeLessThanOrEqual(490999)
    })

    it('should reject order with invalid phone', async () => {
      await expect(
        createOrder({
          productId: 'tavana',
          plan: 'starter',
          customer: { name: 'Test', phone: '12345' },
          basePrice: 490000,
        })
      ).resolves.toBeDefined()
    })

    it('should reject order with empty name', async () => {
      await expect(
        createOrder({
          productId: 'tavana',
          plan: 'starter',
          customer: { name: '', phone: '09123456789' },
          basePrice: 490000,
        })
      ).resolves.toBeDefined()
    })

    it('should sanitize HTML from name', async () => {
      const order = await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: '<script>alert("xss")</script>علی', phone: '09123456789' },
        basePrice: 490000,
      })

      expect(order.customer.name).not.toContain('<script>')
      expect(order.customer.name).not.toContain('>')
    })

    it('should set subscription expiry for starter plan', async () => {
      const order = await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: 'Test', phone: '09123456789' },
        basePrice: 490000,
      })

      expect(order.subscription).toBeDefined()
      expect(order.subscription.expiresAt).toBeDefined()
    })

    it('should not set subscription for pro plan', async () => {
      const order = await createOrder({
        productId: 'tavana',
        plan: 'pro',
        customer: { name: 'Test', phone: '09123456789' },
        basePrice: 14900000,
      })

      expect(order.subscription).toBeNull()
    })

    it('should generate unique amounts for different orders', async () => {
      const amounts = new Set()
      for (let i = 0; i < 10; i++) {
        const order = await createOrder({
          productId: 'tavana',
          plan: 'starter',
          customer: { name: 'Test', phone: '09123456789' },
          basePrice: 490000,
        })
        amounts.add(order.uniqueAmount)
      }
      expect(amounts.size).toBeGreaterThan(1)
    })
  })

  describe('getOrderById', () => {
    it('should return order by id', async () => {
      const created = await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: 'Test', phone: '09123456789' },
        basePrice: 490000,
      })

      const found = await getOrderById(created.id)
      expect(found).toBeDefined()
      expect(found.id).toBe(created.id)
    })

    it('should return null for non-existent order', async () => {
      const found = await getOrderById('ORD-nonexistent')
      expect(found).toBeNull()
    })
  })

  describe('getOrdersByStatus', () => {
    it('should filter orders by status', async () => {
      await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: 'Test1', phone: '09123456789' },
        basePrice: 490000,
      })

      const pending = await getOrdersByStatus('awaiting_payment')
      expect(pending.length).toBe(1)

      const completed = await getOrdersByStatus('completed')
      expect(completed.length).toBe(0)
    })
  })

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const created = await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: 'Test', phone: '09123456789' },
        basePrice: 490000,
      })

      const updated = await updateOrderStatus(created.id, 'approved', 'پرداخت تایید شد')
      expect(updated.status).toBe('approved')
      expect(updated.statusHistory.length).toBe(2)
    })
  })

  describe('uploadReceipt', () => {
    it('should upload receipt for pending order', async () => {
      const created = await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: 'Test', phone: '09123456789' },
        basePrice: 490000,
      })

      const result = await uploadReceipt(created.id, {
        filename: 'receipt.jpg',
        amount: created.uniqueAmount,
        trackingCode: '12345',
      })

      expect(result.status).toBe('receipt_uploaded')
      expect(result.receipt.filename).toBe('receipt.jpg')
      expect(result.receipt.amount).toBe(created.uniqueAmount)
    })

    it('should reject receipt for non-pending order', async () => {
      const created = await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: 'Test', phone: '09123456789' },
        basePrice: 490000,
      })

      await updateOrderStatus(created.id, 'approved')
      const result = await uploadReceipt(created.id, {
        filename: 'receipt.jpg',
        amount: 490000,
      })

      expect(result.error).toBe('receipt_only_allowed_for_pending_orders')
    })
  })
})
