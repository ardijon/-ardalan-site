'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toman, faDateTime } from './shared'
import { ExportButton, csvDateTime } from './export'
import { jalaliMonthOf } from '@/lib/jalali'

/**
 * The tab the panel opens on: what needs doing, and what has been earned.
 *
 * Density is the point. Everything here has to fit above the fold on a laptop, so
 * the KPIs are one row of small tiles rather than the six large cards the orders
 * tab used, and the trend is drawn with CSS bars instead of a chart library.
 *
 * WHY THE MONTHS ARE GROUPED HERE AND NOT ON THE SERVER
 * ----------------------------------------------------
 * getOrderStats() returns a Gregorian `byMonth`, because a Gregorian month is the
 * only bucket that can be computed from an ISO string without a calendar. But it is
 * the wrong bucket for an Iranian business — revenue is reconciled against Jalali
 * months — so the trend is re-bucketed here from the order list the tab already
 * fetches, using lib/jalali.js. That conversion is arithmetic, so it would work on
 * the server too; it stays here only because the orders are already in hand.
 */

// Money the site has actually received. Kept in sync with REVENUE_STATUSES in
// lib/orders.js — the server sums the same set for the totals below.
const EARNING = ['approved', 'deploying', 'completed']

const PLAN_LABELS = { starter: 'استارتر', pro: 'حرفه‌ای' }

/** Last 6 Jalali months of earned revenue, oldest first. */
function monthlyTrend(orders) {
  const months = new Map()
  for (const order of orders) {
    if (!EARNING.includes(order.status)) continue
    const month = jalaliMonthOf(order.createdAt)
    if (!month) continue
    const row = months.get(month.key) || { ...month, count: 0, revenue: 0 }
    row.count += 1
    row.revenue += Number(order.uniqueAmount) || 0
    months.set(month.key, row)
  }
  return [...months.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-6)
}

function Tile({ label, value, unit, hint, tone = 'default' }) {
  const tones = {
    default: 'text-[var(--color-primary)]',
    accent: 'text-[var(--color-accent)]',
    warn: 'text-amber-500',
  }
  return (
    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="text-xs text-text-soft-50">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${tones[tone]}`}>
        {value}
        {unit && <span className="ms-1 text-xs font-normal text-text-soft-40">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-text-soft-35 truncate">{hint}</div>}
    </div>
  )
}

function Panel({ title, action, children }) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 h-10 border-b border-[var(--color-border)]">
        <h2 className="text-xs font-semibold text-text-soft-60">{title}</h2>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function TrendBars({ rows }) {
  if (!rows.length) {
    return <p className="py-6 text-center text-xs text-text-soft-40">هنوز درآمدی ثبت نشده</p>
  }

  // Scaled to the tallest bar rather than to a fixed ceiling: with two or three
  // sales a month, a fixed scale would draw every month as a flat sliver.
  const max = Math.max(...rows.map(r => r.revenue))

  return (
    <div className="flex items-end justify-between gap-2 h-28">
      {rows.map(row => (
        <div key={row.key} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${toman(row.revenue)} تومان — ${row.count} سفارش`}>
          <span className="text-[10px] text-text-soft-50 tabular-nums">{toman(row.revenue)}</span>
          <div className="w-full flex-1 flex items-end">
            <div
              className="w-full rounded-t bg-accent-soft-70 hover:bg-[var(--color-accent)] transition-colors"
              style={{ height: `${Math.max(4, (row.revenue / max) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-text-soft-40 truncate w-full text-center">{row.label}</span>
        </div>
      ))}
    </div>
  )
}

function Breakdown({ rows, labels }) {
  const entries = Object.entries(rows || {})
    .map(([key, row]) => ({ key, ...row }))
    .sort((a, b) => b.revenue - a.revenue)

  if (!entries.length) {
    return <p className="py-6 text-center text-xs text-text-soft-40">داده‌ای نیست</p>
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-text-soft-40">
          <th className="text-start font-normal pb-2">نام</th>
          <th className="text-start font-normal pb-2">سفارش</th>
          <th className="text-start font-normal pb-2">پرداخت‌شده</th>
          <th className="text-start font-normal pb-2">درآمد</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(row => (
          <tr key={row.key} className="border-t border-[var(--color-border)]">
            <td className="py-2 font-medium text-[var(--color-primary)] truncate max-w-[10rem]">
              {labels?.[row.key] || row.key}
            </td>
            <td className="py-2 tabular-nums text-text-soft-60">{toman(row.orders)}</td>
            <td className="py-2 tabular-nums text-text-soft-60">{toman(row.paid)}</td>
            <td className="py-2 tabular-nums font-medium">{toman(row.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * How often each product page was opened, and how many of those were read.
 *
 * The ratio is the number worth looking at, not the raw count: a product opened
 * a hundred times and read five is a page that fails to hold anyone, which is a
 * copy problem no amount of extra traffic fixes. Cloudflare Web Analytics
 * reports the visits; only this can report the reading.
 */
function VisitStats({ summary, labels, error }) {
  const rows = Object.entries(summary?.byProduct || {})
    .map(([slug, row]) => ({ slug, ...row }))
    .sort((a, b) => b.opens - a.opens)

  if (error) {
    return <p role="alert" className="py-6 text-center text-xs text-[var(--color-danger, '#dc2626')]">خطا در دریافت آمار بازدید — دوباره تلاش کنید</p>
  }

  if (!rows.length) {
    return <p className="py-6 text-center text-xs text-text-soft-40">هنوز بازدیدی ثبت نشده</p>
  }

  const months = summary?.byMonth || []

  return (
    <>
      {months.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-soft-45">
          {months.map(month => (
            <li key={month.key} className="tabular-nums">
              {month.label}:{' '}
              <span className="font-medium text-[var(--color-primary)]">{toman(month.opens)}</span> بازدید ·{' '}
              {toman(month.reads)} خوانده‌شده
            </li>
          ))}
        </ul>
      )}

      <table className="w-full text-xs">
        <thead>
          <tr className="text-text-soft-40">
            <th className="text-start font-normal pb-2">محصول</th>
            <th className="text-start font-normal pb-2">باز شد</th>
            <th className="text-start font-normal pb-2">خوانده شد</th>
            <th className="text-start font-normal pb-2">نرخ خواندن</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.slug} className="border-t border-[var(--color-border)]">
              <td className="py-2 font-medium text-[var(--color-primary)] truncate max-w-[10rem]">
                {labels?.[row.slug] || row.slug}
              </td>
              <td className="py-2 tabular-nums text-text-soft-60">{toman(row.opens)}</td>
              <td className="py-2 tabular-nums text-text-soft-60">{toman(row.reads)}</td>
              <td className={`py-2 tabular-nums font-medium ${row.readRate >= 30 ? 'text-[var(--color-accent)]' : ''}`}>
                {toman(row.readRate)}٪
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* The definition ships with the number. Without it «نرخ خواندن ۱۲٪» is a
          figure the owner has to guess at, and a guessed metric gets ignored. */}
      <p className="mt-2 text-[11px] leading-relaxed text-text-soft-35">
        «خوانده شد» یعنی بیش از ۶۰٪ صفحه دیده شده و بیش از ۴۵ ثانیه باز مانده. هر بازدیدکننده در هر
        نیم‌ساعت یک‌بار شمرده می‌شود، پس عدد تقریبی است نه دقیق.
      </p>
    </>
  )
}

const TONE_STYLES = {
  default: 'bg-gray-100 text-gray-600',
  info: 'bg-blue-100 text-blue-700',
  good: 'bg-green-100 text-green-700',
  bad: 'bg-red-100 text-red-600',
}

const ACTOR_LABELS = { admin: 'مدیر', customer: 'مشتری', system: 'سیستم' }

/**
 * The audit export columns.
 *
 * `actions` is passed in so the exported label is the same Persian string the badge
 * shows — the raw `order.deploy_failed` would be the one column in the file nobody
 * outside this codebase can read.
 */
function auditColumns(actions) {
  return [
    { label: 'زمان', value: row => csvDateTime(row.at) },
    { label: 'رویداد', value: row => actions?.[row.action]?.label || row.action },
    { label: 'شرح', key: 'summary' },
    { label: 'عامل', value: row => ACTOR_LABELS[row.actor] || row.actor },
    { label: 'شناسه', key: 'entityId' },
    // Present on blocked logins and nowhere else, which is the point of the column.
    { label: 'آی‌پی', key: 'ip' },
    { label: 'کد رویداد', key: 'action' },
  ]
}

/**
 * Everything that has changed, newest first.
 *
 * `actions` arrives in the response rather than being imported: lib/audit reads the
 * log through the storage layer, so importing its label table here would pull the KV
 * and filesystem drivers into the client bundle. Taking the labels from the server
 * also means the badge can never name an action the server does not recognise.
 */
function ActivityFeed({ entries, actions }) {
  if (!entries.length) {
    return <p className="py-6 text-center text-xs text-text-soft-40">رویدادی ثبت نشده</p>
  }

  return (
    <ul className="text-xs divide-y divide-[var(--color-border)] max-h-64 overflow-y-auto">
      {entries.map(entry => {
        const meta = actions?.[entry.action] || {}
        return (
          <li key={entry.id} className="py-2 flex items-start gap-2">
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                TONE_STYLES[meta.tone] || TONE_STYLES.default
              }`}
            >
              {meta.label || entry.action}
            </span>
            <span className="min-w-0 flex-1 text-text-soft-70">{entry.summary}</span>
            <span className="shrink-0 text-[10px] text-text-soft-35 tabular-nums">
              {faDateTime(entry.at)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default function Dashboard({ auth, products = [], onGoToOrders, onStats }) {
  const [data, setData] = useState({ orders: [], stats: {} })
  const [activity, setActivity] = useState({ entries: [], actions: {} })
  const [visits, setVisits] = useState(null)
  const [visitsError, setVisitsError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Held in a ref, not a dependency: the parent passes an inline arrow, so a
  // dependency here would give `load` a new identity every render and the effect
  // below would refetch forever.
  const report = useRef(onStats)
  report.current = onStats

  const load = useCallback(async () => {
    if (!auth) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/orders?status=all', { credentials: 'same-origin' })
      if (!res.ok) throw new Error('request failed')
      const json = await res.json()
      setData({ orders: json.orders || [], stats: json.stats || {} })
      report.current?.(json.stats || {})
      setError('')
    } catch {
      setError('خطا در دریافت آمار')
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => { load() }, [load])

  /**
   * The log is fetched separately, and its failures are swallowed.
   *
   * Deliberately not folded into `load`: the numbers are the dashboard and the log is
   * context. A KV hiccup on one collection should leave one empty panel, not replace
   * the whole tab with «خطا در دریافت آمار» and hide figures that read fine.
   */
  useEffect(() => {
    if (!auth) return
    let cancelled = false
    fetch('/api/admin/audit?limit=12', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (cancelled || !json) return
        setActivity({ entries: json.entries || [], actions: json.actions || {} })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [auth])

  // Separate for the same reason as the log above, and doubly so: visit counts
  // are the newest collection here, so an empty panel is a plausible state on its
  // own and must not be able to blank out the revenue figures next to it.
  // A failure is shown, not swallowed: an empty visits panel used to be
  // indistinguishable from "nobody visited", and the route can genuinely fail
  // (KV hiccup) — the admin should know which of the two they are looking at.
  useEffect(() => {
    if (!auth) return
    let cancelled = false
    fetch('/api/admin/visits', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('visits unavailable'))))
      .then(json => {
        if (cancelled) return
        setVisits(json.summary || null)
        setVisitsError(false)
      })
      .catch(() => {
        if (!cancelled) setVisitsError(true)
      })
    return () => { cancelled = true }
  }, [auth])

  const { orders, stats } = data
  const trend = monthlyTrend(orders)

  // Product slugs mean nothing at a glance; the ladder titles do.
  const productLabels = Object.fromEntries(products.map(p => [p.slug, p.shortTitle?.fa || p.title?.fa || p.slug]))

  if (loading) {
    return <div className="py-16 text-center text-sm text-text-soft-50">در حال بارگذاری...</div>
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-3 py-2 text-sm rounded-xl bg-red-50 text-red-600 border border-red-200">{error}</div>
      )}

      {/* The one thing that costs money to ignore goes above the numbers: a
          receipt sitting unreviewed is a customer who has paid and is waiting. */}
      {stats.receiptUploaded > 0 && (
        <button
          onClick={onGoToOrders}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-accent-soft-40 bg-accent-soft-5 text-start hover:bg-accent-soft-10 transition-colors"
        >
          <span className="text-sm font-medium text-[var(--color-primary)]">
            {toman(stats.receiptUploaded)} رسید در انتظار بررسی
            <span className="ms-2 font-normal text-text-soft-50">
              معادل {toman(stats.pendingRevenue)} تومان
            </span>
          </span>
          <span className="text-xs font-medium text-[var(--color-accent)] shrink-0">بررسی کن ←</span>
        </button>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label="درآمد کل" value={toman(stats.revenue)} unit="تومان" tone="accent" hint={`${toman(stats.paidOrders)} سفارش پرداخت‌شده`} />
        <Tile label="در صف بررسی" value={toman(stats.pendingRevenue)} unit="تومان" tone={stats.pendingRevenue > 0 ? 'warn' : 'default'} hint={`${toman(stats.receiptUploaded)} رسید`} />
        <Tile label="میانگین سفارش" value={toman(stats.averageOrderValue)} unit="تومان" />
        <Tile label="نرخ تبدیل" value={`${toman(stats.conversionRate)}٪`} hint={`از ${toman(stats.total)} سفارش`} />
        <Tile label="در جریان" value={toman((stats.pending || 0) + (stats.deploying || 0))} hint={`${toman(stats.pending)} بی‌پرداخت · ${toman(stats.deploying)} دیپلوی`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <Panel title="روند درآمد — ۶ ماه اخیر (شمسی)">
          <TrendBars rows={trend} />
        </Panel>

        <Panel title="به تفکیک محصول">
          <Breakdown rows={stats.byProduct} labels={productLabels} />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <Panel title="به تفکیک پلن">
          <Breakdown rows={stats.byPlan} labels={PLAN_LABELS} />
        </Panel>

        <Panel
          title="آخرین سفارشات"
          action={
            <button onClick={onGoToOrders} className="text-[11px] font-medium text-[var(--color-accent)] hover:underline">
              همه ←
            </button>
          }
        >
          {orders.length === 0 ? (
            <p className="py-6 text-center text-xs text-text-soft-40">هنوز سفارشی ثبت نشده</p>
          ) : (
            <ul className="text-xs divide-y divide-[var(--color-border)]">
              {/* The API already sorts newest-first. */}
              {orders.slice(0, 5).map(order => (
                <li key={order.id} className="py-2 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-[var(--color-primary)]">{order.customer?.name || '—'}</span>
                    <span className="ms-2 text-text-soft-40">
                      {productLabels[order.productId] || order.productId}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-text-soft-60">{toman(order.uniqueAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="بازدید محصولات — ۴۵ روز اخیر (شمسی)">
        <VisitStats summary={visits} labels={productLabels} error={visitsError} />
      </Panel>

      {/* Full width and scrolled internally rather than paired in a two-column row:
          each row is a Persian sentence, and half a column truncates most of them. */}
      <Panel
        title="آخرین رویدادها"
        action={
          /* Re-fetched at click time instead of exporting the twelve rows on screen:
             the panel shows the latest handful because that is all that fits, but the
             file is the archive, and «آخرین رویدادها» exported as twelve lines is not
             a log anyone can audit. 300 is the cap the log itself keeps. */
          <ExportButton
            prefix="activity"
            label="خروجی"
            compact
            columns={auditColumns(activity.actions)}
            rows={async () => {
              const res = await fetch('/api/admin/audit?limit=300', { credentials: 'same-origin' })
              if (!res.ok) throw new Error('request failed')
              return (await res.json()).entries || []
            }}
            disabled={activity.entries.length === 0}
          />
        }
      >
        <ActivityFeed entries={activity.entries} actions={activity.actions} />
      </Panel>
    </div>
  )
}
