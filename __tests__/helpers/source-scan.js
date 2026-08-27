import fs from 'fs'
import path from 'path'

/**
 * Shared source scanning for the guard tests.
 *
 * Both `route-params.test.js` and `claims.test.js` grep the source for a pattern
 * that must never appear. Both of them tripped on their own explanatory comments
 * first — the comments necessarily quote the very thing being banned. Comments
 * are blanked in place rather than dropped so a failure still reports the real
 * line number.
 */

export function codeLines(source) {
  let inBlock = false

  return source.split('\n').map((line, i) => {
    let code = line

    if (inBlock) {
      const end = code.indexOf('*/')
      if (end === -1) return [i + 1, '']
      code = code.slice(end + 2)
      inBlock = false
    }

    const blockStart = code.indexOf('/*')
    if (blockStart !== -1) {
      const end = code.indexOf('*/', blockStart + 2)
      if (end === -1) {
        inBlock = true
        code = code.slice(0, blockStart)
      } else {
        code = code.slice(0, blockStart) + code.slice(end + 2)
      }
    }

    const lineStart = code.indexOf('//')
    if (lineStart !== -1) code = code.slice(0, lineStart)

    return [i + 1, code]
  })
}

/** Lines of `source` whose code (comments excluded) matches `pattern`. */
export function offendingLines(source, pattern) {
  return codeLines(source)
    .filter(([, code]) => pattern.test(code))
    .map(([lineNo, code]) => `${lineNo}: ${code.trim()}`)
}

/**
 * Every `.js`/`.jsx` file under `dir`.
 *
 * With `onlyUnderBrackets`, only files that sit inside a `[param]` directory are
 * returned — everything below a bracketed segment consumes route params, not just
 * its direct children.
 */
export function collectFiles(dir, { onlyUnderBrackets = false } = {}) {
  const found = []

  function walk(current, underBrackets) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)

      if (entry.isDirectory()) {
        walk(full, underBrackets || entry.name.startsWith('['))
        continue
      }

      if (!/\.(js|jsx)$/.test(entry.name)) continue
      if (onlyUnderBrackets && !underBrackets) continue

      found.push(full)
    }
  }

  walk(dir, false)
  return found
}

/** Jest `it.each` rows of `[displayPath, absolutePath]`. */
export function asRows(files) {
  return files.map(f => [path.relative(process.cwd(), f), f])
}
