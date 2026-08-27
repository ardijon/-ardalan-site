import { createOrder, getAllOrders, getOrderStats, updateOrderStatus, getOrderById } from '@/lib/orders'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

// DATA_DIR is set to a scratch directory by jest.setup.js — never src/data.
const ORDERS_FILE = path.join(process.cwd(), process.env.DATA_DIR, 'orders.json')

beforeEach(() => {
  mkdirSync(path.dirname(ORDERS_FILE), { recursive: true })
  writeFileSync(ORDERS_FILE, '[]', 'utf8')
})

describe('Admin Operations', () => {
  describe('getAllOrders', () => {
    it('should return empty array when no orders', async () => {
      const orders = await getAllOrders()
      expect(orders).toEqual([])
    })

    it('should return all orders', async () => {
      await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: 'Ali', phone: '09123456789' },
        basePrice: 490000,
      })
      await createOrder({
        productId: 'tavana',
        plan: 'pro',
        customer: { name: 'Reza', phone: '09987654321' },
        basePrice: 14900000,
      })

      const orders = await getAllOrders()
      expect(orders.length).toBe(2)
    })
  })

  describe('getOrderStats', () => {
    it('should return correct stats', async () => {
      await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: 'Ali', phone: '09123456789' },
        basePrice: 490000,
      })

      const order2 = await createOrder({
        productId: 'tavana',
        plan: 'pro',
        customer: { name: 'Reza', phone: '09987654321' },
        basePrice: 14900000,
      })
      await updateOrderStatus(order2.id, 'approved')

      const stats = await getOrderStats()
      expect(stats.total).toBe(2)
      expect(stats.pending).toBe(1)
      expect(stats.approved).toBe(1)
    })
  })

  describe('Order workflow', () => {
    it('should handle full order lifecycle', async () => {
      const order = await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: 'Test User', phone: '09123456789' },
        basePrice: 490000,
      })

      expect(order.status).toBe('awaiting_payment')

      await updateOrderStatus(order.id, 'receipt_uploaded')
      let current = await getOrderById(order.id)
      expect(current.status).toBe('receipt_uploaded')

      await updateOrderStatus(order.id, 'approved')
      current = await getOrderById(order.id)
      expect(current.status).toBe('approved')

      await updateOrderStatus(order.id, 'deploying')
      current = await getOrderById(order.id)
      expect(current.status).toBe('deploying')

      await updateOrderStatus(order.id, 'completed')
      current = await getOrderById(order.id)
      expect(current.status).toBe('completed')
    })

    it('should track status history', async () => {
      const order = await createOrder({
        productId: 'tavana',
        plan: 'starter',
        customer: { name: 'Test', phone: '09123456789' },
        basePrice: 490000,
      })

      await updateOrderStatus(order.id, 'approved', 'Payment confirmed')
      await updateOrderStatus(order.id, 'completed', 'Deploy finished')

      const final = await getOrderById(order.id)
      expect(final.statusHistory.length).toBe(3)
      expect(final.statusHistory[0].status).toBe('awaiting_payment')
      expect(final.statusHistory[1].status).toBe('approved')
      expect(final.statusHistory[2].status).toBe('completed')
    })
  })
})
