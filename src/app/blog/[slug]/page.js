import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getArticle, getAllSlugs } from '@/lib/articles'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BlogArticleContent from '@/components/BlogArticleContent'
import { SITE_URL } from '@/lib/constants'

export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

function getLocale(requestCookies) {
  const cookie = requestCookies.get('NEXT_LOCALE')?.value
  if (cookie === 'fa' || cookie === 'en') return cookie
  return 'fa'
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return {}
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `${SITE_URL}/blog/${slug}`,
      type: 'article',
      publishedTime: article.isoDate || article.date,
      images: [
        {
          url: '/profile.png',
          width: 512,
          height: 512,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: ['/profile.png'],
    },
  }
}

export default function BlogPost({ params }) {
  let locale = 'fa'
  try {
    const cookieStore = cookies()
    locale = getLocale(cookieStore)
  } catch {}

  const article = getArticle(params.slug, locale)
  if (!article) return notFound()

  return (
    <>
      <Header />
      <main className="pt-28 pb-20">
        <BlogArticleContent slug={params.slug} />
      </main>
      <Footer />
    </>
  )
}
