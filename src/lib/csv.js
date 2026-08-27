/**
 * CSV that Microsoft Excel actually opens correctly, in Persian, on a Persian Windows.
 *
 * That sentence is doing a lot of work. A plain UTF-8 CSV fails in three separate
 * ways before an admin ever sees a readable table, and each one has to be handled
 * here rather than at the call sites:
 *
 * 1. THE BOM. Without a byte-order mark Excel decodes the file with the system ANSI
 *    codepage, and every Persian string arrives as mojibake — «Ù…Ø±ÛŒÙ…» instead of
 *    «مریم». This is the one the phase item was named after.
 *
 * 2. THE SEPARATOR. Excel splits on the *system list separator*, which on a Persian
 *    Windows is a semicolon, not a comma. So a correct BOM alone gets you readable
 *    text crammed into column A. `sep=,` on the first line is an Excel directive that
 *    pins the delimiter regardless of locale. The cost is that other readers show it
 *    as one stray row — worth paying when the named target is Excel, and cheap to
 *    change here if that ever stops being true.
 *
 * 3. FORMULA INJECTION. Excel treats a cell beginning with `=`, `+`, `-`, `@` or a
 *    control character as a formula. Order data contains fields a buyer typed —
 *    name, domain, hosting notes — so without neutralising them a customer could put
 *    `=HYPERLINK(...)` in their name and have it run on the admin's machine when the
 *    export is opened. Quoting does not help; Excel parses the formula after
 *    unquoting.
 *
 * Pure, with no imports, so both a client component and a route can use it and so
 * the tests can call it directly.
 */

/** U+FEFF. Excel's only reliable signal that the file is UTF-8. */
export const CSV_BOM = '﻿'

export const CSV_DELIMITER = ','

/** CRLF, per RFC 4180 and per what Excel expects on Windows. */
export const CSV_NEWLINE = '\r\n'

/**
 * Whether Excel would evaluate this text as a formula rather than show it.
 *
 * A leading `+` or `-` is exempted when the whole value parses as a number, because
 * a negative amount and a `+98…` phone number are data, and prefixing every one of
 * them with an apostrophe would put a visible quote mark in front of half a column.
 */
function looksLikeFormula(text) {
  if (!/^[=@\t\r]/.test(text) && !/^[+-]/.test(text)) return false
  if (/^[+-]/.test(text) && Number.isFinite(Number(text))) return false
  return true
}

/**
 * One value as a CSV field.
 *
 * Arrays join with ` | ` rather than a comma: the field would be quoted either way,
 * but a comma inside a cell reads to a human scanning the raw file as a column break
 * that is not there.
 */
export function csvCell(value) {
  let text

  if (value === null || value === undefined) {
    text = ''
  } else if (Array.isArray(value)) {
    text = value.filter(v => v !== null && v !== undefined && v !== '').join(' | ')
  } else if (value instanceof Date) {
    text = Number.isFinite(value.getTime()) ? value.toISOString() : ''
  } else if (typeof value === 'object') {
    text = JSON.stringify(value)
  } else {
    text = String(value)
  }

  // The apostrophe goes inside the quotes, so the value is still one field and the
  // only difference is that Excel shows it instead of running it.
  if (looksLikeFormula(text)) text = `'${text}`

  // Always quoted, not only when it contains a delimiter. Persian text is full of
  // ZWNJ and Arabic commas, and deciding per-cell whether a character needs quoting
  // is how a single unescaped row shifts every column after it.
  return `"${text.replace(/"/g, '""')}"`
}

/**
 * Rows as a CSV document, ready to download.
 *
 * @param {Array<{key?: string, label: string, value?: (row: any) => any}>} columns
 *   `label` heads the column; the cell is `value(row)` when given, else `row[key]`.
 * @param {Array<any>} rows
 */
export function toCsv(columns, rows) {
  const header = columns.map(column => csvCell(column.label)).join(CSV_DELIMITER)

  const body = (Array.isArray(rows) ? rows : []).map(row =>
    columns
      .map(column => csvCell(column.value ? column.value(row) : row?.[column.key]))
      .join(CSV_DELIMITER)
  )

  // A header with no rows on purpose: an empty file looks like the export broke,
  // whereas headers and nothing under them say the filter matched nothing.
  return CSV_BOM + `sep=${CSV_DELIMITER}` + CSV_NEWLINE + [header, ...body].join(CSV_NEWLINE) + CSV_NEWLINE
}

/**
 * A filename with the Jalali date in it, in Latin digits.
 *
 * Latin digits because the file lands in Windows Explorer, where Persian digits sort
 * unpredictably and some tools still mangle them in paths. `stamp` is passed in
 * rather than computed so this module stays free of imports.
 */
export function csvFilename(prefix, stamp) {
  const safe = String(prefix || 'export').replace(/[^a-z0-9-]/gi, '')
  return `${safe || 'export'}-${String(stamp).replace(/[^0-9-]/g, '')}.csv`
}
