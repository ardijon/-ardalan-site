import { notFound } from 'next/navigation'
import { getArticle, getAllSlugs } from '@/lib/articles'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BlogArticleContent from '@/components/BlogArticleContent'
import { SITE_URL } from '@/lib/constants'

export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
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
    // Without this, every article inherited the root layout's canonical and told
    // crawlers it was a duplicate of the homepage — while `og:url` above pointed at
    // the article. The blog is the content most likely to earn search traffic, so
    // this was the most expensive place to leave it out.
    alternates: {
      canonical: `${SITE_URL}/blog/${slug}`,
    },
  }
}

export default async function BlogPost({ params }) {
  // Next 16 only *warns* on synchronous `params` access — it never backfills the
  // value. `params.slug` was undefined here, so every article 404'd.
  const { slug } = await params

  // The locale is resolved client-side by BlogArticleContent via useI18n(), and
  // getArticle() matches on slug alone, so this page needs no cookie read.
  const article = getArticle(slug)
  if (!article) return notFound()

  return (
    <>
      <Header />
      <main className="pt-28 pb-20">
        <BlogArticleContent slug={slug} />
      </main>
      <Footer />
    </>
  )
}
