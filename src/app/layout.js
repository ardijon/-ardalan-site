import './globals.css'
import { I18nProvider } from '@/lib/i18n/I18nProvider'
import Analytics from '@/components/Analytics'
import { SITE_URL } from '@/lib/constants'
import dictionary from '@/lib/i18n/dictionary'

/** Server-rendered so the skip link is in the HTML before hydration. */
function SkipLabel() {
  return dictionary.fa?.header?.skipToContent || 'رفتن به محتوا'
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata = {
  title: {
    default: 'اردلان | توسعه‌دهنده نرم‌افزار و هوش مصنوعی',
    template: '%s | اردلان',
  },
  description: 'اردلان پیری — توسعه‌دهنده نرم‌افزار و هوش مصنوعی، با پشتوانه‌ی ۸ سال تجربه‌ی عملی در صنایع مختلف',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: SITE_URL,
    siteName: 'اردلان',
    title: 'اردلان | توسعه‌دهنده نرم‌افزار و هوش مصنوعی',
    description: 'اردلان پیری — توسعه‌دهنده نرم‌افزار و هوش مصنوعی، با پشتوانه‌ی ۸ سال تجربه‌ی عملی در صنایع مختلف',
    images: [
      {
        url: '/profile.png',
        width: 512,
        height: 512,
        alt: 'اردلان',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'اردلان | توسعه‌دهنده نرم‌افزار و هوش مصنوعی',
    description: 'اردلان پیری — توسعه‌دهنده نرم‌افزار و هوش مصنوعی، با پشتوانه‌ی ۸ سال تجربه‌ی عملی در صنایع مختلف',
    images: ['/profile.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }) {
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'اردلان پیری',
    url: SITE_URL,
    jobTitle: ['توسعه‌دهنده نرم‌افزار', 'متخصص هوش مصنوعی', 'تحلیلگر بازارهای مالی', 'مشاور بیمه'],
    knowsAbout: ['React', 'Next.js', 'Python', 'هوش مصنوعی', 'تحلیل تکنیکال', 'بیمه'],
    sameAs: [
      'https://t.me/ArdalanPiri',
      'https://wa.me/989189199141',
    ],
  }

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'اردلان',
    url: SITE_URL,
    description: 'توسعه‌دهنده نرم‌افزار | متخصص هوش مصنوعی | تحلیلگر بازارهای مالی | مشاور بیمه',
    inLanguage: 'fa',
  }

  return (
    <html lang="fa" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#F8F6F3" />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Language switching is client-side on one URL: per-locale alternates
            all pointing at the same address are noise to crawlers, and the
            x-default promised a URL structure that does not exist. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var t = localStorage.getItem('theme');
              var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
              if (dark) {
                document.documentElement.classList.add('dark');
              }
              var meta = document.querySelector('meta[name="theme-color"]');
              if (meta) meta.content = dark ? '#0B1120' : '#F8F6F3';

              // localStorage only, never the cookie: the cookie was written by a
              // middleware that guessed from Accept-Language, so it says what the
              // browser is set to rather than what this person chose. See
              // savedLocale() in I18nProvider.
              var lang = localStorage.getItem('NEXT_LOCALE');
              if (lang !== 'fa' && lang !== 'en') lang = 'fa';

              // Expose to I18nProvider via window.__LOCALE so React reads the
              // saved locale BEFORE its first render — avoiding the hydration
              // mismatch that occurred when useState('fa') disagreed with the
              // DOM attribute the script had already set to 'en'.
              // DO NOT set documentElement.lang or .dir here — React owns those
              // attributes during hydration and would overwrite them, causing a
              // flash. I18nProvider's useEffect applies them after hydration.
              window.__LOCALE = lang;

              // Set direction for FOUC prevention. The <html dir="rtl"> from JSX
              // is correct for Persian (the default), but English users would see
              // a brief RTL flash before useEffect applies LTR. We set the inline
              // style on <html> (not the dir attribute, which React owns) so the
              // first paint uses the correct direction. CSS style.direction
              // overrides the dir attribute for layout purposes.
              //
              // This script runs in <head> where document.body is still null, so
              // we use documentElement instead. The inline style does not conflict
              // with React's dir attribute management.
              document.documentElement.style.direction = lang === 'fa' ? 'rtl' : 'ltr';
            })();
          `
        }} />
        {/* Stale-chunk self-heal. Prerendered pages ship with a one-year CDN
            cache (s-maxage=31536000), so a visitor can hold HTML from build A
            while the server already serves build B. The first menu click then
            asks the router for chunk hashes build B no longer has, which throws
            ChunkLoadError and blanks the page — an async import failure the
            error boundary never sees. Reload once to fetch matching HTML and
            chunks. The timestamp cooldown stops a reload loop if the server is
            genuinely down, yet still lets a later deploy in the same tab heal. */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var KEY = '__chunkReloadAt';
              var COOLDOWN = 15000;
              function isChunkError(text) {
                return /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|module script failed/i.test(text || '');
              }
              function recover() {
                var now = Date.now();
                try {
                  var last = Number(sessionStorage.getItem(KEY) || 0);
                  if (now - last < COOLDOWN) return;
                  sessionStorage.setItem(KEY, String(now));
                } catch (e) { /* storage blocked: allow the single reload */ }
                window.location.reload();
              }
              window.addEventListener('error', function(e) {
                if (isChunkError(e.message)) recover();
              });
              window.addEventListener('unhandledrejection', function(e) {
                var r = e.reason;
                if (isChunkError(r && (r.message || r.name || String(r)))) recover();
              });
            })();
          `
        }} />

      </head>
      <body className="min-h-screen antialiased">
        {/* First focusable element: ~13 header links precede <main>, and
            keyboard users had to tab through all of them on every page (WCAG
            2.4.1). The dictionary key existed for this link; it just was never
            rendered. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--color-accent)] focus:text-white focus:font-bold focus:text-sm"
        >
          <SkipLabel />
        </a>
        <I18nProvider>
          {children}
        </I18nProvider>
        {/* Last in body, per Cloudflare's install instructions. */}
        <Analytics />
      </body>
    </html>
  )
}
