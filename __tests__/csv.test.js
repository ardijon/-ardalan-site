import fs from 'fs'
import path from 'path'
import { toCsv, csvCell, csvFilename, CSV_BOM, CSV_NEWLINE } from '@/lib/csv'
import { collectFiles, codeLines, offendingLines } from './helpers/source-scan'

/**
 * The export is only useful if Excel opens it correctly, and only safe if a value a
 * customer typed cannot become a formula.
 *
 * Both failures are invisible from here. A missing BOM produces a file that opens
 * without complaint and shows «Ù…Ø±ÛŒÙ…» where a name should be; a `=cmd|…` in a
 * customer's name produces a file that looks fine until Excel offers to enable
 * content. Neither shows up in the panel, so the guarantees have to be asserted
 * against the bytes.
 */

const COLUMNS = [
  { label: 'نام', key: 'name' },
  { label: 'مبلغ', key: 'amount' },
]

/** The data rows, with the BOM/`sep=` preamble and the header stripped off. */
function bodyRows(csv) {
  return csv.trimEnd().split(CSV_NEWLINE).slice(2)
}

describe('what Excel needs', () => {
  it('starts with the BOM, before anything else', () => {
    // Before anything else specifically: a BOM in the middle of the file is just a
    // zero-width character, and Excel has already picked a codepage by then.
    const csv = toCsv(COLUMNS, [{ name: 'مریم', amount: 1000 }])
    expect(csv.startsWith(CSV_BOM)).toBe(true)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('declares the separator on the first line', () => {
    // On a Persian Windows the list separator is `;`, so without this line a
    // correctly-decoded file still lands entirely in column A.
    const csv = toCsv(COLUMNS, [])
    expect(csv.split(CSV_NEWLINE)[0]).toBe(`${CSV_BOM}sep=,`)
  })

  it('ends every line with CRLF', () => {
    const csv = toCsv(COLUMNS, [{ name: 'الف', amount: 1 }, { name: 'ب', amount: 2 }])
    // A bare LF anywhere means a line ending that is not CRLF.
    expect(csv.replace(/\r\n/g, '')).not.toMatch(/\n/)
    expect(csv.endsWith(CSV_NEWLINE)).toBe(true)
  })

  it('keeps the Persian text as Persian text', () => {
    const csv = toCsv(COLUMNS, [{ name: 'مریم رضایی', amount: 0 }])
    expect(csv).toContain('مریم رضایی')
    expect(csv).toContain('"نام"')
  })
})

describe('quoting', () => {
  it('doubles a quote instead of ending the field', () => {
    // The classic corruption: one unescaped quote shifts every column after it, and
    // Persian copy is full of «» and " pairs.
    expect(csvCell('محصول "توانا"')).toBe('"محصول ""توانا"""')
  })

  it('keeps a comma inside one field', () => {
    const csv = toCsv(COLUMNS, [{ name: 'رضایی, مریم', amount: 5 }])
    expect(bodyRows(csv)[0]).toBe('"رضایی, مریم","5"')
  })

  it('keeps a newline inside one field', () => {
    // Multi-line hostingInfo is normal. RFC 4180 allows it inside quotes, and Excel
    // reads it correctly — provided the quotes are there.
    const csv = toCsv(COLUMNS, [{ name: 'خط اول\nخط دوم', amount: 1 }])
    expect(bodyRows(csv)[0]).toBe('"خط اول\nخط دوم","1"')
  })
})

describe('a customer-supplied value cannot become a formula', () => {
  it('neutralises the four dangerous leading characters', () => {
    // `=cmd|' /C calc'!A0` in a name field is the textbook payload, and the file is
    // opened on the admin's own machine.
    expect(csvCell('=HYPERLINK("http://x","بزن")')).toMatch(/^"'=/)
    expect(csvCell('@SUM(A1:A9)')).toMatch(/^"'@/)
    expect(csvCell('\tنام')).toMatch(/^"'\t/)
    expect(csvCell('\rنام')).toMatch(/^"'\r/)
  })

  it('leaves a negative number and a +98 phone alone', () => {
    // The reason the check is not just /^[=+\-@]/: a refund and an international
    // phone number are the two most likely values in this export to start with a
    // sign, and an apostrophe in front of either is a visible defect in every row.
    expect(csvCell(-500000)).toBe('"-500000"')
    expect(csvCell('-500000')).toBe('"-500000"')
    expect(csvCell('+989123456789')).toBe('"+989123456789"')
    // But a formula that merely starts with a sign is still caught.
    expect(csvCell('-2+3*cmd')).toMatch(/^"'-/)
    expect(csvCell('+SUM(A1)')).toMatch(/^"'\+/)
  })

  it('puts the guard inside the quotes, so the row keeps its shape', () => {
    const csv = toCsv(COLUMNS, [{ name: '=1+1', amount: 3 }])
    expect(bodyRows(csv)[0]).toBe(`"'=1+1","3"`)
    // Two fields, not three — the apostrophe must not introduce a delimiter.
    expect(bodyRows(csv)[0].split('","')).toHaveLength(2)
  })
})

describe('coercion', () => {
  it('renders an empty cell for nothing at all', () => {
    // `undefined` reaching a cell is normal: `row.receipt?.amount` on an order with
    // no receipt yet. The string "undefined" in a column of amounts is worse than a
    // blank, because it sorts and it looks like data.
    expect(csvCell(undefined)).toBe('""')
    expect(csvCell(null)).toBe('""')
    expect(csvCell('')).toBe('""')
  })

  it('joins an array with a pipe rather than a comma', () => {
    // Quoted either way, but a comma inside a cell reads as a column break to
    // anyone opening the raw file.
    expect(csvCell(['توانا', 'رهیار'])).toBe('"توانا | رهیار"')
    // Empty members are dropped instead of leaving a dangling separator.
    expect(csvCell(['توانا', '', null])).toBe('"توانا"')
    expect(csvCell([])).toBe('""')
  })

  it('does not lose a number to formatting', () => {
    // The whole point of not using `toman()` here: Excel must see a number.
    expect(csvCell(1234567)).toBe('"1234567"')
    expect(csvCell(0)).toBe('"0"')
    expect(csvCell(false)).toBe('"false"')
  })

  it('survives an object or a bad date', () => {
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"')
    expect(csvCell(new Date('2026-08-23T06:30:00.000Z'))).toBe('"2026-08-23T06:30:00.000Z"')
    expect(csvCell(new Date('nope'))).toBe('""')
  })
})

describe('toCsv', () => {
  it('writes a header even with no rows', () => {
    // An empty file reads as a broken export. Headers with nothing under them say
    // the export worked and the filter matched nothing.
    const csv = toCsv(COLUMNS, [])
    const lines = csv.trimEnd().split(CSV_NEWLINE)
    expect(lines).toHaveLength(2)
    expect(lines[1]).toBe('"نام","مبلغ"')
  })

  it('takes a cell from `value` when given, and from `key` otherwise', () => {
    const csv = toCsv(
      [
        { label: 'شناسه', key: 'id' },
        { label: 'نام مشتری', value: row => row.customer?.name },
      ],
      [{ id: 'ORD-1', customer: { name: 'مریم' } }]
    )
    expect(bodyRows(csv)[0]).toBe('"ORD-1","مریم"')
  })

  it('emits an empty cell for a nested field that is not there', () => {
    // `row.receipt?.uploadedAt` on an unpaid order. This must not throw mid-file and
    // leave a truncated download.
    const csv = toCsv([{ label: 'رسید', value: row => row.receipt?.amount }], [{ id: 'ORD-2' }])
    expect(bodyRows(csv)[0]).toBe('""')
  })

  it('never throws on a row set that is not an array', () => {
    expect(() => toCsv(COLUMNS, null)).not.toThrow()
    expect(() => toCsv(COLUMNS, undefined)).not.toThrow()
    expect(toCsv(COLUMNS, null).trimEnd().split(CSV_NEWLINE)).toHaveLength(2)
  })

  it('keeps the column order it was given', () => {
    // Columns are a bookkeeping document; a reordered header on the next export
    // breaks whatever the admin built on top of the last one.
    const csv = toCsv(COLUMNS, [{ name: 'الف', amount: 9 }])
    expect(csv.trimEnd().split(CSV_NEWLINE)[1]).toBe('"نام","مبلغ"')
  })
})

describe('csvFilename', () => {
  it('is safe to write to disk', () => {
    expect(csvFilename('orders', '1405-06-01')).toBe('orders-1405-06-01.csv')
    // Windows rejects most of these outright, and a slash would make it a path.
    expect(csvFilename('سفارش/ها', '1405-06-01')).toBe('export-1405-06-01.csv')
    expect(csvFilename('', 'x')).toBe('export-.csv')
  })

  it('keeps the date in Latin digits', () => {
    // Persian digits in a filename sort unpredictably in Explorer and are still
    // mangled by some upload forms.
    expect(csvFilename('leads', '۱۴۰۵-۰۶-۰۱')).not.toMatch(/[۰-۹]/)
  })
})

describe('the panel builds its exports the same way everywhere', () => {
  const ADMIN = path.join(process.cwd(), 'src', 'components', 'Admin')
  const files = collectFiles(ADMIN)

  it('has an export button on every list tab', () => {
    // Orders, leads, customers, and the activity log. A tab that shows a list and
    // cannot export it is the one the admin will ask about.
    const tabs = ['OrderManagement.js', 'Leads.js', 'Customers.js', 'Dashboard.js']
    for (const tab of tabs) {
      const source = fs.readFileSync(path.join(ADMIN, tab), 'utf8')
      expect(source).toContain('<ExportButton')
    }
  })

  it('formats money and dates for the spreadsheet, not for the panel', () => {
    /**
     * `toman()` returns Persian digits with an Arabic thousands separator and
     * `faDate` returns a Persian-digit Jalali date. Both are correct in the panel and
     * both are text to Excel — a revenue column formatted that way cannot be summed
     * and a date column cannot be sorted, which is most of what the file is for.
     */
    const bad = []
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')
      for (const [lineNo, code] of codeLines(source)) {
        if (!/^\s*\{\s*label:/.test(code)) continue
        if (/\b(toman|faDate|faDateTime)\s*\(/.test(code)) {
          bad.push(`${path.relative(process.cwd(), file)}:${lineNo}: ${code.trim()}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('keeps the BOM in one place', () => {
    // A second BOM written at download time lands inside the first header cell,
    // where it is invisible and breaks an exact match on the column name.
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')
      expect(offendingLines(source, /\\uFEFF|CSV_BOM/)).toEqual([])
    }
  })

  it('declares its column tables at module scope', () => {
    // Same rule as the form primitives: a `columns` array is cheap to rebuild, but a
    // component defined inside a tab remounts and drops the caret from the search box
    // beside it. `ExportButton` lives in export.js for exactly that reason.
    const source = fs.readFileSync(path.join(ADMIN, 'export.js'), 'utf8')
    expect(offendingLines(source, /^\s+function\s+[A-Z]\w*\s*\(/)).toEqual([])
  })
})
