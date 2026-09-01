'use client'

import { useState, useEffect, useCallback } from 'react'
import { STATUS_LABELS, STATUS_COLORS, FilterChip, SearchBox, toman, faDate } from './shared'
import { ExportButton, csvDate } from './export'

/**
 * One row per person, instead of one row per order.
 *
 * The orders tab answers "what do I have to do next". This answers a different
 * question the orders tab cannot: "who is this, and have we done business before".
 * Before this existed, finding out that a phone number had bought twice meant
 * searching the orders list and counting by eye.
 *
 * There is no edit here on purpose — a customer is derived from their orders (see
 * lib/customers.js), so the way to correct a name is to correct the order it came
 * from. An edit form on this tab would be a second place the same fact is stored.
 */

const FILTERS = [
  { key: 'all', label: 'همه', statKey: 'total' },
  { key: 'paying', label: 'خریدار', statKey: 'paying' },
  // The number that says whether the product was worth the money to someone who
  // had already paid once.
  { key: 'repeat', label: 'خرید مجدد', statKey: 'repeat' },
  { key: 'review', label: 'منتظر بررسی', statKey: 'needsReview' },
]

const PLAN_LABELS = { starter: 'استارتر', pro: 'حرفه‌ای' }

/**
 * The export columns, as a factory rather than a constant.
 *
 * `productLabels` is built from the products prop, so the table cannot be a plain
 * module-level array — and it has to stay out of the component body anyway, since
 * only the call is per-render, not the definition.
 *
 * Money and counts go out as raw numbers, deliberately: `toman()` returns Persian
 * digits with an Arabic thousands separator, which Excel stores as text. A revenue
 * column you cannot sum is the one thing an admin will certainly try to do with this
 * file, so the formatting the panel uses is exactly what the export must not use.
 */
function customerColumns(productLabels) {
  return [
    { label: 'نام', key: 'name' },
    { label: 'تلفن', key: 'phone' },
    { label: 'ایمیل', key: 'email' },
    { label: 'دامنه', key: 'domain' },
    { label: 'تعداد سفارش', key: 'orderCount' },
    { label: 'سفارش پرداخت‌شده', key: 'paidCount' },
    { label: 'مجموع خرید (تومان)', key: 'revenue' },
    { label: 'محصولات', value: row => (row.products || []).map(slug => productLabels[slug] || slug) },
    { label: 'پلن‌ها', value: row => (row.plans || []).map(plan => PLAN_LABELS[plan] || plan) },
    { label: 'رسید در انتظار بررسی', key: 'needsReview' },
    { label: 'اولین سفارش', value: row => csvDate(row.firstOrderAt) },
    { label: 'آخرین سفارش', value: row => csvDate(row.lastOrderAt) },
  ]
}

function Tile({ label, value, unit }) {
  return (
    <div className="px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="text-[10px] text-text-soft-40">{label}</div>
      <div className="mt-0.5 text-base font-bold text-[var(--color-primary)] tabular-nums">
        {value}
        {unit && <span className="ms-1 text-[10px] font-normal text-text-soft-40">{unit}</span>}
      </div>
    </div>
  )
}

/** The order history for one customer, shown only when their row is expanded. */
function OrderHistory({ orders, productLabels }) {
  return (
    <div className="space-y-1.5 px-3 pb-3">
      {orders.map(order => (
        <div
          key={order.id}
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
        >
          <span className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
          <span className="text-[11px] font-medium text-[var(--color-primary)] truncate">
            {productLabels[order.productId] || order.productId}
          </span>
          <span className="text-[10px] text-text-soft-40 shrink-0">
            {PLAN_LABELS[order.plan] || order.plan}
          </span>
          <span className="text-[10px] text-text-soft-30 shrink-0 font-mono" dir="ltr">{order.id}</span>
          <div className="flex-1" />
          <span className="text-[11px] tabular-nums text-text-soft-60 shrink-0">
            {toman(order.uniqueAmount)}
          </span>
          <span className="text-[10px] text-text-soft-40 shrink-0">{faDate(order.createdAt)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Customers({ auth, products = [] }) {
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState({})
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Phone, not index: the list reorders when the filter changes, and an index
  // would leave a different customer expanded than the one that was clicked.
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchCustomers = useCallback(async () => {
    if (!auth) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ filter })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const res = await fetch(`/api/admin/customers?${params}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error('request failed')
      const data = await res.json()
      setCustomers(Array.isArray(data.customers) ? data.customers : [])
      setStats(data.stats && typeof data.stats === 'object' ? data.stats : {})
      setError('')
    } catch {
      setCustomers([])
      setError('خطا در بارگذاری مشتریان')
    } finally {
      setLoading(false)
    }
  }, [auth, filter, debouncedSearch])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const productLabels = Object.fromEntries(
    products.map(p => [p.slug, p.shortTitle?.fa || p.title?.fa || p.slug])
  )

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="px-4 py-2.5 text-sm rounded-xl bg-red-50 text-red-600 border border-red-200">{error}</div>
      )}

      <div className="flex items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="نام، تلفن، ایمیل یا دامنه" />
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {FILTERS.map(item => (
            <FilterChip
              key={item.key}
              label={item.label}
              count={stats[item.statKey] || 0}
              active={filter === item.key}
              onClick={() => setFilter(item.key)}
            />
          ))}
        </div>

        {/* Exports the filtered list, not the whole collection — the button sits next
            to the chips because what it produces is whatever they are showing. */}
        <ExportButton
          prefix="customers"
          columns={customerColumns(productLabels)}
          rows={customers}
          disabled={customers.length === 0}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="کل مشتریان" value={toman(stats.total)} unit="نفر" />
        <Tile label="خریدار واقعی" value={toman(stats.paying)} unit="نفر" />
        <Tile label="خرید مجدد" value={toman(stats.repeat)} unit="نفر" />
        <Tile label="میانگین خرید هر مشتری" value={toman(stats.averageRevenue)} unit="تومان" />
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-text-soft-50">در حال بارگذاری...</div>
      ) : customers.length === 0 ? (
        <div className="py-10 text-center text-sm text-text-soft-50">مشتری‌ای یافت نشد</div>
      ) : (
        <div className="space-y-1.5">
          {customers.map(customer => {
            const open = expanded === customer.phone
            return (
              <div
                key={customer.phone}
                className={`rounded-xl border transition-colors ${
                  open ? 'border-accent-soft-40' : 'border-[var(--color-border)]'
                }`}
              >
                <button
                  onClick={() => setExpanded(open ? null : customer.phone)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-start"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--color-primary)] truncate">{customer.name}</span>
                      {customer.needsReview > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 shrink-0">
                          {customer.needsReview} رسید جدید
                        </span>
                      )}
                      {customer.paidCount > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 shrink-0">
                          مشتری تکراری
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-soft-50">
                      <span className="tabular-nums" dir="ltr">{customer.phone}</span>
                      {customer.email && <span className="truncate" dir="ltr">{customer.email}</span>}
                      {customer.domain && <span className="truncate" dir="ltr">{customer.domain}</span>}
                    </div>
                  </div>

                  {/* Products bought, so the row says what this person owns without
                      being expanded — the most common reason to look someone up. */}
                  <div className="hidden md:flex items-center gap-1 shrink-0">
                    {customer.products.map(slug => (
                      <span
                        key={slug}
                        className="px-1.5 py-0.5 rounded text-[10px] border border-[var(--color-border)] text-text-soft-50 max-w-[8rem] truncate"
                      >
                        {productLabels[slug] || slug}
                      </span>
                    ))}
                  </div>

                  <div className="text-end shrink-0">
                    <div className="text-sm font-bold text-[var(--color-primary)] tabular-nums">
                      {toman(customer.revenue)}
                      <span className="ms-1 text-[10px] font-normal text-text-soft-40">تومان</span>
                    </div>
                    <div className="text-[10px] text-text-soft-40 tabular-nums">
                      {customer.paidCount} از {customer.orderCount} سفارش · {faDate(customer.lastOrderAt)}
                    </div>
                  </div>

                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`shrink-0 text-text-soft-30 transition-transform ${open ? 'rotate-90' : '-rotate-90'}`}
                    aria-hidden="true"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {open && <OrderHistory orders={customer.orders} productLabels={productLabels} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
