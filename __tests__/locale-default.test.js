import fs from 'fs'
import path from 'path'
import { offendingLines } from './helpers/source-scan'

/**
 * The site opens in Persian.
 *
 * This regressed once already, and invisibly: a middleware read Accept-Language and
 * wrote NEXT_LOCALE from it, so the very first request decided the language before
 * the visitor had any say. Nearly every phone sold in Iran has an English system
 * locale, which made the header the worst available signal — the Persian site
 * greeted its Persian audience in English, and the provider had no way to tell that
 * cookie apart from a real choice.
 *
 * So the rule these tests hold is narrow and mechanical: nothing may derive a locale
 * from the request, and only an explicit toggle may persist one.
 */

const read = p => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

describe('default locale', () => {
  it('should have no middleware or proxy that inspects Accept-Language', () => {
    // Deleted rather than fixed: with the header sniffing gone it did nothing but
    // re-set a cookie the client already owns, at the cost of a Worker invocation
    // on every request.
    const candidates = ['src/middleware.js', 'src/middleware.ts', 'src/proxy.js', 'src/proxy.ts', 'middleware.js', 'proxy.js']
    const present = candidates.filter(p => fs.existsSync(path.join(process.cwd(), p)))

    for (const file of present) {
      expect(offendingLines(read(file), /Accept-Language|acceptLanguage/i)).toEqual([])
      expect(offendingLines(read(file), /NEXT_LOCALE/)).toEqual([])
    }
  })

  it('should default the provider to fa before anything is read', () => {
    const source = read('src/lib/i18n/I18nProvider.js')
    expect(source).toMatch(/useState\('fa'\)/)
  })

  it('should not read the locale from a cookie', () => {
    // A cookie can be written by the server, so it cannot prove the visitor chose
    // anything. localStorage can only have come from toggleLocale.
    for (const file of ['src/lib/i18n/I18nProvider.js', 'src/app/layout.js']) {
      expect(offendingLines(read(file), /document\.cookie|NEXT_LOCALE=\(/)).toEqual([])
    }
  })

  it('should fall back to fa in the pre-hydration script, not to the browser language', () => {
    const source = read('src/app/layout.js')
    expect(source).toMatch(/localStorage\.getItem\('NEXT_LOCALE'\)/)
    expect(source).toMatch(/lang !== 'fa' && lang !== 'en'\) lang = 'fa'/)
    expect(offendingLines(source, /navigator\.language|navigator\.languages/)).toEqual([])
  })
})
