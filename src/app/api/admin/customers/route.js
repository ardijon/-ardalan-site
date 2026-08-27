import { NextResponse } from 'next/server'
import { getCustomers, getCustomerStats } from '@/lib/customers'
import { guardAdminRoute } from '@/lib/admin-auth'

/**
 * The customer list for the panel.
 *
 * Read-only, and there is no PATCH: a customer is derived from orders, so the way
 * to change one is to change an order. A write endpoint here would be a second
 * source of truth for the same facts.
 */

export async function GET(request) {
  const denied = await guardAdminRoute(request)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const search = (searchParams.get('search') || '').trim()
  const filter = searchParams.get('filter') || 'all'

  // Over everyone, never the filtered slice — the counts are what the filters are
  // chosen from.
  const stats = await getCustomerStats()

  let customers = await getCustomers()

  if (filter === 'paying') customers = customers.filter(c => c.paidCount > 0)
  if (filter === 'repeat') customers = customers.filter(c => c.paidCount > 1)
  if (filter === 'review') customers = customers.filter(c => c.needsReview > 0)

  if (search) {
    const q = search.toLowerCase()
    customers = customers.filter(c =>
      c.phone.includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q)
    )
  }

  return NextResponse.json({ customers, stats })
}
