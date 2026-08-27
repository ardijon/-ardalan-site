'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ReceiptViewer from './ReceiptViewer'
import { STATUS_LABELS, STATUS_COLORS, FilterChip, SearchBox, toman, faDate, faDateTime } from './shared'
import { ExportButton, csvDateTime } from './export'

const MESSAGE_TEMPLATES = {
  approve: 'پرداخت شما تایید شد. پنل شما در حال راه‌اندازی است و به زودی لینک آن برای شما ارسال می‌شود.',
  reject_amount: 'مبلغ واریزی شما با مبلغ سفارش مطابقت ندارد. لطفاً مبلغ دقیق را واریز کرده و رسید جدید آپلود کنید.',
  reject_receipt: 'رسید پرداخت شما معتبر نیست. لطفاً تصویر واضح رسید بانکی را مجدداً آپلود کنید.',
}

// The filter chips, in the order an order actually moves through them, so the row
// reads as a pipeline rather than an arbitrary list.
const FILTERS = [
  { key: 'all', label: 'همه', statKey: 'total' },
  { key: 'awaiting_payment', label: 'در انتظار پرداخت', statKey: 'pending' },
  { key: 'receipt_uploaded', label: 'رسید جدید', statKey: 'receiptUploaded' },
  { key: 'approved', label: 'تایید شده', statKey: 'approved' },
  { key: 'deploying', label: 'در حال دیپلوی', statKey: 'deploying' },
  { key: 'completed', label: 'تکمیل شده', statKey: 'completed' },
]

// Module scope, so a re-render of the parent does not remount the search input and
// drop the caret mid-word — the same rule the product form fields follow. Both live
// in shared.js now; three tabs had grown their own copy.

/**
 * The export columns for orders.
 *
 * This is the one export that is a bookkeeping document, so it carries the fields a
 * spreadsheet needs and the panel does not show: the tracking code and the receipt's
 * declared amount side by side with the order amount, because reconciling those two
 * numbers against a bank statement is the whole job, and «مبلغ رسید» differing from
 * «مبلغ سفارش» is exactly the row you are looking for.
 *
 * Amounts are raw numbers rather than `toman()` output — Persian digits with an
 * Arabic separator are text to Excel, and a total column that cannot be summed makes
 * the file useless for the thing it is for.
 */
const ORDER_COLUMNS = [
  { label: 'کد سفارش', key: 'id' },
  { label: 'تاریخ ثبت', value: row => csvDateTime(row.createdAt) },
  { label: 'وضعیت', value: row => STATUS_LABELS[row.status] || row.status },
  { label: 'نام مشتری', value: row => row.customer?.name },
  { label: 'تلفن', value: row => row.customer?.phone },
  { label: 'ایمیل', value: row => row.customer?.email },
  { label: 'دامنه', value: row => row.customer?.domain },
  { label: 'محصول', key: 'productId' },
  { label: 'پلن', key: 'plan' },
  { label: 'مبلغ سفارش (تومان)', key: 'uniqueAmount' },
  { label: 'مبلغ رسید (تومان)', value: row => row.receipt?.amount },
  { label: 'کد پیگیری', value: row => row.receipt?.trackingCode },
  { label: 'تاریخ رسید', value: row => csvDateTime(row.receipt?.uploadedAt) },
  { label: 'آخرین بروزرسانی', value: row => csvDateTime(row.updatedAt) },
  // The last note, not the whole history: a status change without its reason is
  // half a record, and the full array would be a wall of JSON in one cell.
  { label: 'آخرین یادداشت', value: row => row.statusHistory?.at(-1)?.note },
  { label: 'اطلاعات هاست', value: row => row.customer?.hostingInfo },
]

export default function OrderManagement({ auth, onStats }) {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({})
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [receiptViewerOrder, setReceiptViewerOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [copiedTemplate, setCopiedTemplate] = useState(null)

  // See Dashboard: kept in a ref so an inline callback from the page does not
  // change fetchOrders' identity and re-fire the effect below on every render.
  const report = useRef(onStats)
  report.current = onStats

  // Debounce the search box so typing fires one request, not one per keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // useCallback keeps a stable identity — without it this function is recreated
  // every render and the effect below re-fires forever.
  const fetchOrders = useCallback(async () => {
    if (!auth) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: filter })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const res = await fetch(`/api/admin/orders?${params}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error('request failed')
      const data = await res.json()
      setOrders(Array.isArray(data.orders) ? data.orders : [])
      const next = data.stats && typeof data.stats === 'object' ? data.stats : {}
      setStats(next)
      report.current?.(next)
    } catch {
      setOrders([])
      setMessage('خطا در بارگذاری سفارشات')
    } finally {
      setLoading(false)
    }
  }, [auth, filter, debouncedSearch])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  async function updateOrderStatus(orderId, status, note = '') {
    setActionLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ orderId, status, note }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'بروزرسانی ناموفق بود')
      }

      setMessage(`سفارش ${orderId} بروزرسانی شد`)
      setSelectedOrder(null)
      await fetchOrders()
    } catch (e) {
      setMessage('خطا: ' + e.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function copyTemplate(key) {
    const text = MESSAGE_TEMPLATES[key]
    try {
      await navigator.clipboard.writeText(text)
      setCopiedTemplate(key)
      setTimeout(() => setCopiedTemplate(null), 2000)
    } catch {
      setMessage('خطا در کپی متن')
    }
  }

  async function generateZip(orderId) {
    setActionLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ orderId }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'تولید ZIP ناموفق بود')

      setMessage('ZIP با موفقیت تولید شد')
      await fetchOrders()
    } catch (e) {
      setMessage('خطا: ' + e.message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {message && (
        <div className="px-4 py-3 text-sm rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
          {message}
        </div>
      )}

      {/* One toolbar line. This was six cards with text-2xl counts plus a
          full-width search row below them — around 200px of chrome above a list
          that is the reason for opening the tab. The counts still show, just at
          label size, and they still filter on click. */}
      <div className="flex items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="نام، تلفن یا کد سفارش" />

        {/* Scrolls sideways rather than wrapping: a second line of chips would
            push the list down again on a narrow window. */}
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

        {/* The filtered list, not the collection: «تایید شده» plus a date in the
            search box is how you produce the month's sales sheet, and re-querying
            the server for everything would throw that selection away. */}
        <ExportButton
          prefix="orders"
          columns={ORDER_COLUMNS}
          rows={orders}
          disabled={orders.length === 0}
        />
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-8 text-[var(--color-text)]/50">در حال بارگذاری...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-text)]/50">سفارشی یافت نشد</div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div
              key={order.id}
              className="p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-[var(--color-text)]/40">{order.id}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-[var(--color-primary)]">
                    {order.customer?.name} — {order.customer?.phone}
                  </div>
                  <div className="text-xs text-[var(--color-text)]/40 mt-1">
                    {order.productId} | {order.plan} | {faDate(order.createdAt)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {order.status === 'receipt_uploaded' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'approved')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      تایید پرداخت
                    </button>
                  )}
                  {order.status === 'receipt_uploaded' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'rejected')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      رد پرداخت
                    </button>
                  )}
                  {order.status === 'approved' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'deploying')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                    >
                      شروع دیپلوی
                    </button>
                  )}
                  {order.status === 'approved' && order.plan === 'pro' && (
                    <button
                      onClick={() => generateZip(order.id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      تولید ZIP
                    </button>
                  )}
                  {order.deployment?.downloadUrl && (
                    <a
                      href={order.deployment.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      دانلود ZIP
                    </a>
                  )}
                  {order.status === 'deploying' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      تکمیل دیپلوی
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    className="px-3 py-1.5 text-xs font-medium text-[var(--color-text)]/60 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-text)]/5 transition-colors"
                  >
                    جزئیات
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedOrder?.id === order.id && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[var(--color-text)]/50">ایمیل: </span>
                      <span className="text-[var(--color-text)]">{order.customer?.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text)]/50">دامنه: </span>
                      <span className="text-[var(--color-text)]" dir="ltr">{order.customer?.domain || '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[var(--color-text)]/50">اطلاعات هاست: </span>
                      <span className="text-[var(--color-text)] text-xs">{order.customer?.hostingInfo || '—'}</span>
                    </div>
                  </div>

                  {order.receipt && (
                    <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <div className="text-xs font-medium text-[var(--color-text)]/50 mb-2">رسید پرداخت</div>
                      <div className="flex items-center gap-4">
                        {order.receipt.filename && (
                          <button
                            onClick={() => setReceiptViewerOrder(order)}
                            className="text-sm text-[var(--color-accent)] hover:underline"
                          >
                            مشاهده رسید
                          </button>
                        )}
                        {order.receipt.amount > 0 && (
                          <span className="text-sm text-[var(--color-text)]">
                            مبلغ: {toman(order.receipt.amount)} تومان
                          </span>
                        )}
                        {order.receipt.trackingCode && (
                          <span className="text-sm text-[var(--color-text)]">
                            کد پیگیری: {order.receipt.trackingCode}
                          </span>
                        )}
                      </div>

                      {/* Message Templates */}
                      {order.status === 'receipt_uploaded' && (
                        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                          <div className="text-xs font-medium text-[var(--color-text)]/50 mb-2">قالب پیام</div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => copyTemplate('approve')}
                              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              {copiedTemplate === 'approve' ? 'کپی شد!' : 'قالب تایید'}
                            </button>
                            <button
                              onClick={() => copyTemplate('reject_amount')}
                              className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 transition-colors"
                            >
                              {copiedTemplate === 'reject_amount' ? 'کپی شد!' : 'رد (مبلغ نادرست)'}
                            </button>
                            <button
                              onClick={() => copyTemplate('reject_receipt')}
                              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              {copiedTemplate === 'reject_receipt' ? 'کپی شد!' : 'رد (رسید نامعتبر)'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {order.deployment?.downloadUrl && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-2">فایل آماده دانلود</div>
                      <a
                        href={order.deployment.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        دانلود فایل ZIP
                      </a>
                    </div>
                  )}

                  {/* Status History */}
                  {order.statusHistory?.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-[var(--color-text)]/50">تاریخچه وضعیت</div>
                      {order.statusHistory.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-text)]/40">
                          <span className={`px-1.5 py-0.5 rounded ${STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS[h.status] || h.status}
                          </span>
                          <span>{faDateTime(h.at)}</span>
                          {h.note && <span>— {h.note}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {receiptViewerOrder && (
        <ReceiptViewer order={receiptViewerOrder} onClose={() => setReceiptViewerOrder(null)} />
      )}
    </div>
  )
}
