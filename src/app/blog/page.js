import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BlogList from '@/components/BlogList'
import { SITE_URL } from '@/lib/constants'

// The blog moved off the landing page onto its own route. The title is bare
// ('وبلاگ') because the root layout's template wraps it as 'وبلاگ | اردلان';
// repeating the brand here would double it. Server metadata stays Persian like
// every other page — the visible content localizes client-side via useI18n().
export const metadata = {
  title: 'وبلاگ',
  description: 'نوشته‌هایی درباره هوش مصنوعی، اتوماسیون و نوآوری در کسب‌وکار — از اردلان پیری',
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    title: 'وبلاگ',
    description: 'نوشته‌هایی درباره هوش مصنوعی، اتوماسیون و نوآوری در کسب‌وکار — از اردلان پیری',
    url: `${SITE_URL}/blog`,
    type: 'website',
    images: [
      {
        url: '/profile.png',
        width: 512,
        height: 512,
        alt: 'وبلاگ اردلان پیری',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'وبلاگ',
    description: 'نوشته‌هایی درباره هوش مصنوعی، اتوماسیون و نوآوری در کسب‌وکار — از اردلان پیری',
    images: ['/profile.png'],
  },
}

export default function BlogPage() {
  return (
    <>
      <Header />
      <main className="pt-28 pb-20">
        <BlogList />
      </main>
      <Footer />
    </>
  )
}