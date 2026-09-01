'use client'

import { formatJalali, formatJalaliDateTime, toPersianDigits } from '@/lib/jalali'
import { ORDER_STATUSES } from '@/lib/order-status'

/**
 * Primitives every admin tab shares.
 *
 * These were copied per tab until there were three of them. Status labels are the
 * reason it stopped being acceptable: when the same order reads "تایید شده" in one
 * tab and "پرداخت تایید شد" in another, the panel is lying about which of the two
 * is the status the system stores.
 *
 * Everything here is at module scope, and must stay that way — a component defined
 * inside a tab is a new component type on every render, so React remounts it and
 * any focused input inside it loses the caret. That rule is why the filter chip
 * lives in a file of its own rather than next to the tab that renders it.
 */

/**
 * The order statuses the API accepts, in Persian. One source, all tabs.
 *
 * Re-exported rather than declared: the same table is what the API validates
 * against and what the audit log writes into its summaries, and it now lives in
 * lib/order-status.js — a module with no imports, so the server can read it without
 * pulling this `'use client'` file in. This alias stays because every tab imports
 * `STATUS_LABELS` from here.
 */
export const STATUS_LABELS = ORDER_STATUSES

export const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  awaiting_payment: 'bg-yellow-100 text-yellow-700',
  receipt_uploaded: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  deploying: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

/**
 * Persian digits with thousands separators.
 *
 * Hand-rolled rather than `toLocaleString('fa-IR')` for the same reason as the
 * dates: workerd's ICU is trimmed, and a price that quietly renders as 1,234,567
 * in a Persian panel is a defect nobody notices until a customer is quoted from
 * it. The output is byte-identical to what full ICU produces, separator included.
 */
export function toman(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return toPersianDigits('0')
  const [whole, ...rest] = Math.abs(n).toString().split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '٬')
  return toPersianDigits((n < 0 ? '-' : '') + [grouped, ...rest].join('.'))
}

/** Jalali date, or an em dash for anything unparseable. */
export const faDate = formatJalali

/** Jalali date plus Tehran wall clock. */
export const faDateTime = formatJalaliDateTime

/**
 * One filter button. `count` is optional — omit it for a filter whose total is not
 * a number worth showing, rather than passing 0 and displaying a zero.
 */
export function FilterChip({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 shrink-0 h-9 px-3 rounded-lg border text-xs font-medium transition-colors ${
        active
          ? 'border-[var(--color-accent)] bg-accent-soft-10 text-[var(--color-accent)]'
          : 'border-[var(--color-border)] text-text-soft-60 hover:border-accent-soft-30 hover:text-[var(--color-text)]'
      }`}
    >
      <span className="truncate max-w-[9rem]">{label}</span>
      {count != null && (
        <span className={`tabular-nums ${active ? '' : 'text-text-soft-40'}`}>{count}</span>
      )}
    </button>
  )
}

/** The search box every list tab puts at the head of its toolbar. */
export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative w-52 shrink-0">
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-soft-30"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-9 pr-9 pl-3 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-text-soft-40 focus:outline-none focus:ring-2 focus:ring-accent-soft-40 focus:border-[var(--color-accent)] transition-all"
      />
    </div>
  )
}
