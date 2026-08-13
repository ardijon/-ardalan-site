'use client'

import { useState, useEffect } from 'react'

const STATUS_LABELS = {
  pending: 'در انتظار ثبت',
  awaiting_payment: 'در انتظار پرداخت',
  receipt_uploaded: 'رسید دریافت شد',
  approved: 'تایید شده',
  rejected: 'رد شده',
  deploying: 'در حال دیپلوی',
  completed: 'تکمیل شده',
}

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  awaiting_payment: 'bg-yellow-100 text-yellow-700',
  receipt_uploaded: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  deploying: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

export default function OrderManagement({ auth }) {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({})
  const [filter, setFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')

  function getAuthHeader() {
    return { Authorization: `Basic ${btoa(`${auth.user}:${auth.pass}`)}` }
  }

  async function fetchOrders() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders?status=${filter}`, {
        headers: getAuthHeader(),
      })
      const data = await res.json()
      setOrders(data.orders || [])
      setStats(data.stats || {})
    } catch {
      setMessage('خطا در بارگذاری سفارشات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auth) fetchOrders()
  }, [auth, filter, fetchOrders])

  async function updateOrderStatus(orderId, status, note = '') {
    setActionLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ orderId, status, note }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }

      setMessage(`سفارش ${orderId} بروزرسانی شد`)
      await fetchOrders()
      setSelectedOrder(null)
    } catch (e) {
      setMessage('خطا: ' + e.message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="px-4 py-3 text-sm rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
          {message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'all', label: 'همه', count: stats.total || 0 },
          { key: 'awaiting_payment', label: 'در انتظار پرداخت', count: stats.pending || 0 },
          { key: 'receipt_uploaded', label: 'رسید جدید', count: stats.receiptUploaded || 0 },
          { key: 'deploying', label: 'در حال دیپلوی', count: stats.deploying || 0 },
          { key: 'completed', label: 'تکمیل شده', count: stats.completed || 0 },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`p-3 rounded-xl border text-center transition-all ${
              filter === item.key
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
            }`}
          >
            <div className="text-2xl font-bold text-[var(--color-primary)]">{item.count}</div>
            <div className="text-xs text-[var(--color-text)]/50 mt-1">{item.label}</div>
          </button>
        ))}
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
                    {order.productId} | {order.plan} | {new Date(order.createdAt).toLocaleDateString('fa-IR')}
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
                          <a
                            href={`/uploads/receipts/${order.receipt.filename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[var(--color-accent)] hover:underline"
                          >
                            مشاهده رسید
                          </a>
                        )}
                        {order.receipt.amount > 0 && (
                          <span className="text-sm text-[var(--color-text)]">
                            مبلغ: {order.receipt.amount.toLocaleString('fa-IR')} تومان
                          </span>
                        )}
                        {order.receipt.trackingCode && (
                          <span className="text-sm text-[var(--color-text)]">
                            کد پیگیری: {order.receipt.trackingCode}
                          </span>
                        )}
                      </div>
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
                          <span>{new Date(h.at).toLocaleString('fa-IR')}</span>
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
    </div>
  )
}
