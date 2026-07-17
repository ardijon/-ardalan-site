import './globals.css'
import { I18nProvider } from '@/lib/i18n/I18nProvider'
import { SITE_URL } from '@/lib/constants'

export const metadata = {
  title: {
    default: 'اردلان | خدمات فناوری و بیمه',
    template: '%s | اردلان',
  },
  description: 'اردلان پیری — توسعه‌دهنده نرم‌افزار | متخصص هوش مصنوعی | تحلیلگر بازارهای مالی | مشاور بیمه',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    url: SITE_URL,
    siteName: 'اردلان',
    title: 'اردلان | خدمات فناوری و بیمه',
    description: 'اردلان پیری — توسعه‌دهنده نرم‌افزار | متخصص هوش مصنوعی | تحلیلگر بازارهای مالی | مشاور بیمه',
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
    title: 'اردلان | خدمات فناوری و بیمه',
    description: 'اردلان پیری — توسعه‌دهنده نرم‌افزار | متخصص هوش مصنوعی | تحلیلگر بازارهای مالی | مشاور بیمه',
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
            })();
          `
        }} />

      </head>
      <body className="min-h-screen antialiased">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
