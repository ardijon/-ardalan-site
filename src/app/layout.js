import './globals.css'
import { I18nProvider } from '@/lib/i18n/I18nProvider'
import Analytics from '@/components/Analytics'
import { SITE_URL } from '@/lib/constants'

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
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#F8F6F3" />
        <link rel="icon" href="/profile.png" sizes="any" />
        <link rel="apple-touch-icon" href="/profile.png" />
        <link rel="alternate" hrefLang="fa" href={SITE_URL} />
        <link rel="alternate" hrefLang="en" href={SITE_URL} />
        <link rel="alternate" hrefLang="x-default" href={SITE_URL} />
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

      </head>
      <body className="min-h-screen antialiased">
        <I18nProvider>
          {children}
        </I18nProvider>
        {/* Last in body, per Cloudflare's install instructions. */}
        <Analytics />
      </body>
    </html>
  )
}
