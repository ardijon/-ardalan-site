'use client'

import { useState } from 'react'
import { toCsv, csvFilename } from '@/lib/csv'
import { jalaliParts } from '@/lib/jalali'

/**
 * The download half of the CSV export.
 *
 * Split from lib/csv.js because that file is pure and this one is not: `Blob`,
 * `URL.createObjectURL` and a synthetic anchor click only exist in a browser, and
 * keeping them apart is what lets the formatting be unit-tested without a DOM.
 *
 * The export is generated in the browser from the rows already on screen rather than
 * by a new `/api/admin/export` route, for two reasons. The rows are already here, so
 * a route would re-read the collection to produce data the client is holding; and
 * what the admin wants is *what they are looking at* — the current filter and search
 * applied — which the client knows and a fresh server query would have to be told.
 */

const pad = n => String(n).padStart(2, '0')

/** '1405-06-01' in Latin digits, for a filename. */
function todayStamp() {
  const p = jalaliParts(new Date())
  if (!p) return 'unknown'
  return `${p.jy}-${pad(p.jm)}-${pad(p.jd)}`
}

/**
 * '1405/06/01' — the panel's Jalali date, but in Latin digits.
 *
 * Not `faDate`: Persian digits in a spreadsheet are text Excel cannot sort by, and
 * sorting a column of dates is most of the reason to open the export at all. Latin
 * digits and zero padding make the string sort correctly as a string, which is the
 * best available outcome given that Excel has no Jalali date type.
 */
export function csvDate(iso) {
  const p = jalaliParts(iso)
  return p ? `${p.jy}/${pad(p.jm)}/${pad(p.jd)}` : ''
}

/** '1405/06/01 17:37' — for rows where the time of day is the point. */
export function csvDateTime(iso) {
  const p = jalaliParts(iso)
  return p ? `${p.jy}/${pad(p.jm)}/${pad(p.jd)} ${pad(p.hour)}:${pad(p.minute)}` : ''
}

/**
 * Hand a string to the browser as a file download.
 *
 * `text/csv;charset=utf-8` and nothing else: the BOM is already the first character
 * of `content`, and adding a second one here would put a stray U+FEFF inside the
 * first header cell — which shows up as an invisible character that breaks an exact
 * match on the column name and is close to impossible to spot in Excel.
 *
 * Verifying that is a trap worth naming: `blob.text()` strips a leading BOM while
 * decoding, per the Encoding Standard, so reading the blob back as text always looks
 * like the BOM went missing. The bytes are the only honest check — the file starts
 * `EF BB BF`, confirmed against `blob.arrayBuffer()`.
 */
export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  // Appended before clicking because Firefox ignores a click on a detached anchor.
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Freed on the next tick, not immediately: revoking synchronously races the
  // browser's read of the blob in Safari and produces an empty file.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * The export button every list tab puts in its toolbar.
 *
 * `rows` takes either an array or a function returning one (or a promise of one), so
 * a tab that already holds its data passes the array and the activity log — which
 * shows twelve entries but should export three hundred — passes a fetch. The busy
 * state exists for that second case; with an array in hand it is never seen.
 *
 * At module scope, like every other admin primitive: a component declared inside a
 * tab is a new type on each render, so React remounts it and the search box beside
 * it loses focus mid-word.
 */
export function ExportButton({ columns, rows, prefix, label = 'خروجی CSV', disabled, compact }) {
  const [busy, setBusy] = useState(false)

  async function run() {
    if (busy) return
    setBusy(true)
    try {
      const data = typeof rows === 'function' ? await rows() : rows
      downloadCsv(csvFilename(prefix, todayStamp()), toCsv(columns, data || []))
    } catch (error) {
      // Nothing in the UI: the button is a convenience, and an error banner over a
      // list that is otherwise fine is a worse trade than a click that did nothing.
      console.error('[export] could not build the CSV:', error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={run}
      disabled={disabled || busy}
      title={label}
      // `compact` matches the 40px panel headers; the default matches the h-9
      // toolbar the filter chips and the search box sit in.
      className={`flex items-center gap-1.5 shrink-0 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text)]/60 hover:border-[var(--color-accent)]/30 hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
        compact ? 'h-7 px-2' : 'h-9 px-3'
      }`}
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className="shrink-0" aria-hidden="true"
      >
        <path d="M12 3v12" />
        <path d="M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      <span>{busy ? 'در حال ساخت…' : label}</span>
    </button>
  )
}
