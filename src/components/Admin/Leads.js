'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FilterChip, SearchBox, faDate } from './shared'
import { ExportButton, csvDate } from './export'

/**
 * The waitlist for products that have not shipped.
 *
 * Built around the one job this list exists for: on release day, get every phone
 * number for one product out of here and into a bulk SMS panel, then record that
 * it was sent. So "copy the numbers" and "mark them sent" are the two primary
 * buttons, and the per-product counts are filters rather than decoration — the
 * product with the longest queue is also the answer to what to finish next.
 */

const STATUS_FILTERS = [
  { key: 'all', label: 'همه' },
  { key: 'pending', label: 'در انتظار اطلاع' },
  { key: 'notified', label: 'اطلاع داده شده' },
]

/**
 * The export columns.
 *
 * The phone column is first for the same reason «کپی شماره‌ها» exists: the file is
 * going into a bulk SMS panel, and the numbers being in column A is the difference
 * between a paste and a cleanup. `source` is included even though the table does not
 * show it — the export is where you go to answer «کدام صفحه این سرنخ را آورد».
 */
function leadColumns(productLabels) {
  return [
    { label: 'تلفن', key: 'phone' },
    { label: 'ایمیل', key: 'email' },
    { label: 'محصول', value: row => productLabels[row.productSlug] || row.productSlug },
    { label: 'منبع', key: 'source' },
    { label: 'تاریخ ثبت', value: row => csvDate(row.createdAt) },
    { label: 'تاریخ اطلاع', value: row => csvDate(row.notifiedAt) },
    { label: 'وضعیت', value: row => (row.notifiedAt ? 'اطلاع داده شده' : 'در انتظار') },
  ]
}

export default function Leads({ auth, products = [], onStats }) {
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState({ byProduct: {}, pendingByProduct: {} })
  const [product, setProduct] = useState('all')
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const report = useRef(onStats)
  report.current = onStats

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchLeads = useCallback(async () => {
    if (!auth) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ product, status })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const res = await fetch(`/api/admin/leads?${params}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error('request failed')
      const data = await res.json()
      setLeads(Array.isArray(data.leads) ? data.leads : [])
      const next = data.stats && typeof data.stats === 'object' ? data.stats : {}
      setStats({ byProduct: {}, pendingByProduct: {}, ...next })
      report.current?.(next)
    } catch {
      setLeads([])
      setMessage('خطا در بارگذاری سرنخ‌ها')
    } finally {
      setLoading(false)
    }
  }, [auth, product, status, debouncedSearch])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const productLabels = Object.fromEntries(
    products.map(p => [p.slug, p.shortTitle?.fa || p.title?.fa || p.slug])
  )

  async function copyPhones() {
    // One per line: pastes straight into an SMS panel's recipients box and into a
    // spreadsheet column without any further cleanup.
    const text = leads.map(l => l.phone).filter(Boolean).join('\n')
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage('خطا در کپی شماره‌ها')
    }
  }

  async function markNotified(ids) {
    if (ids.length === 0) return
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ leadIds: ids }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'بروزرسانی ناموفق بود')
      setMessage(`${data.changed} سرنخ به‌عنوان اطلاع‌داده‌شده ثبت شد`)
      await fetchLeads()
    } catch (e) {
      setMessage('خطا: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  function markAllShown() {
    const ids = leads.filter(l => !l.notifiedAt).map(l => l.id)
    if (ids.length === 0) return
    // Confirmed because it is a claim about the real world — that these people were
    // actually contacted — and there is no undo for it in the panel.
    if (!confirm(`${ids.length} سرنخ نمایش‌داده‌شده به‌عنوان «اطلاع داده شده» ثبت شود؟`)) return
    markNotified(ids)
  }

  const pendingShown = leads.filter(l => !l.notifiedAt).length

  return (
    <div className="space-y-3">
      {message && (
        <div className="px-4 py-2.5 text-sm rounded-xl bg-orange-50 text-orange-700 border border-orange-200">
          {message}
        </div>
      )}

      <div className="flex items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="تلفن یا ایمیل" />

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {STATUS_FILTERS.map(item => (
            <FilterChip
              key={item.key}
              label={item.label}
              count={item.key === 'pending' ? stats.pending : item.key === 'all' ? stats.total : undefined}
              active={status === item.key}
              onClick={() => setStatus(item.key)}
            />
          ))}
        </div>

        {/* Next to the filters rather than in the action bar below: that bar is about
            release day — copy the numbers, then record that they were contacted — and
            this is the same "give me what I am looking at" as on the other tabs. */}
        <ExportButton
          prefix="leads"
          columns={leadColumns(productLabels)}
          rows={leads}
          disabled={leads.length === 0}
        />
      </div>

      {/* Product row is separate from the status row: they combine rather than
          replace each other, and putting them on one line made it look like
          picking a product would clear the status. */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <FilterChip label="همهٔ محصولات" count={stats.total} active={product === 'all'} onClick={() => setProduct('all')} />
        {Object.entries(stats.byProduct || {})
          .sort((a, b) => b[1] - a[1])
          .map(([slug, count]) => (
            <FilterChip
              key={slug}
              label={productLabels[slug] || slug}
              // The pending count, not the total: it is what is left to do.
              count={stats.pendingByProduct?.[slug] ?? count}
              active={product === slug}
              onClick={() => setProduct(slug)}
            />
          ))}
      </div>

      {/* The two release-day actions. Hidden when the list is empty, so the bar
          does not sit there offering to copy nothing. */}
      {leads.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <span className="text-xs text-[var(--color-text)]/50">
            {leads.length} نتیجه
            {pendingShown > 0 && ` · ${pendingShown} در انتظار`}
          </span>
          <div className="flex-1" />
          <button
            onClick={copyPhones}
            className="h-8 px-3 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text)]/70 hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
          >
            {copied ? 'کپی شد!' : `کپی شماره‌ها (${leads.length})`}
          </button>
          <button
            onClick={markAllShown}
            disabled={busy || pendingShown === 0}
            className="h-8 px-3 text-xs font-medium text-white bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            علامت‌زدن {pendingShown} مورد
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-[var(--color-text)]/50">در حال بارگذاری...</div>
      ) : leads.length === 0 ? (
        <div className="py-10 text-center text-sm text-[var(--color-text)]/50">سرنخی یافت نشد</div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[var(--color-surface)] text-[var(--color-text)]/40">
              <tr>
                <th className="text-start font-normal px-3 py-2">تلفن</th>
                <th className="text-start font-normal px-3 py-2">ایمیل</th>
                <th className="text-start font-normal px-3 py-2">محصول</th>
                <th className="text-start font-normal px-3 py-2">تاریخ</th>
                <th className="text-start font-normal px-3 py-2">وضعیت</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 font-medium text-[var(--color-primary)] tabular-nums" dir="ltr">{lead.phone}</td>
                  <td className="px-3 py-2 text-[var(--color-text)]/60 truncate max-w-[14rem]" dir="ltr">{lead.email || '—'}</td>
                  <td className="px-3 py-2 text-[var(--color-text)]/60 truncate max-w-[10rem]">
                    {productLabels[lead.productSlug] || lead.productSlug}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text)]/40">{faDate(lead.createdAt)}</td>
                  <td className="px-3 py-2">
                    {lead.notifiedAt ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700">
                        {faDate(lead.notifiedAt)}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700">در انتظار</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-end">
                    {!lead.notifiedAt && (
                      <button
                        onClick={() => markNotified([lead.id])}
                        disabled={busy}
                        className="text-[var(--color-accent)] hover:underline disabled:opacity-40"
                      >
                        علامت‌زدن
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
