/**
 * Every status an order can be in, with the Persian label the panel shows.
 *
 * Its own module, with no imports, because three different layers need it and none
 * of them can import from the others: the API route validates against these keys,
 * the admin components render the labels in the browser, and lib/audit writes them
 * into log summaries on the server. Putting them in lib/orders would drag `crypto`
 * and the storage drivers into the client bundle; putting them in Admin/shared.js
 * would mark a server module as `'use client'`.
 *
 * The keys were duplicated as a `validStatuses` array in the orders route and as a
 * `STATUS_LABELS` object in the panel. They had already diverged — a status the
 * route accepted rendered as `undefined` in the tab that displayed it.
 */

export const ORDER_STATUSES = {
  pending: 'در انتظار ثبت',
  awaiting_payment: 'در انتظار پرداخت',
  receipt_uploaded: 'رسید دریافت شد',
  approved: 'تایید شده',
  rejected: 'رد شده',
  deploying: 'در حال دیپلوی',
  completed: 'تکمیل شده',
}

/** The list the API validates against. Derived, so it cannot fall out of step. */
export const ORDER_STATUS_KEYS = Object.keys(ORDER_STATUSES)

/** The label, or the raw key — a log entry is worth more than an empty cell. */
export function orderStatusLabel(status) {
  return ORDER_STATUSES[status] || status || '—'
}
