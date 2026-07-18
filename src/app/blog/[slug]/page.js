import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getArticle, getAllSlugs } from '@/lib/articles'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { SITE_URL } from '@/lib/constants'
import dictionary from '@/lib/i18n/dictionary'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

function getLocale(requestCookies) {
  const cookie = requestCookies.get('NEXT_LOCALE')?.value
  if (cookie === 'fa' || cookie === 'en') return cookie
  return 'fa'
}

export function generateMetadata({ params }) {
  const article = getArticle(params.slug)
  if (!article) return {}
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `${SITE_URL}/blog/${params.slug}`,
      type: 'article',
      publishedTime: article.date,
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
  const cookieStore = cookies()
  const locale = getLocale(cookieStore)
  const t = (path) => path.split('.').reduce((o, k) => o?.[k], dictionary[locale]) ?? path

  const article = getArticle(params.slug, locale)
  if (!article) return notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.isoDate || article.date,
    author: {
      '@type': 'Person',
      name: locale === 'en' ? 'Ardalan Piri' : 'اردلان پیری',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: locale === 'en' ? 'Ardalan' : 'اردلان',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/profile.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${params.slug}`,
    },
  }

  return (
    <>
      <Header />
      <main className="pt-28 pb-20">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <Link
            href="/#blog"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]/50 hover:text-[var(--color-accent)] transition-colors mb-8"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t('blog.back')}
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 text-xs font-medium text-[var(--color-tech)] bg-[var(--color-tech)]/10 rounded-full">
              {article.cat}
            </span>
            <span className="text-sm text-[var(--color-text)]/40">{article.date}</span>
            <span className="text-sm text-[var(--color-text)]/40">· {article.readTime} {t('blog.minuteRead')}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--color-primary)] leading-tight mb-8">
            {article.title}
          </h1>

          <div
            className="prose prose-lg max-w-none text-[var(--color-text)]/80 leading-relaxed
              prose-headings:text-[var(--color-primary)] prose-headings:font-bold
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-base prose-p:leading-8
              prose-strong:text-[var(--color-text)]
              prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-[var(--color-accent)] prose-blockquote:text-[var(--color-text)]/70 prose-blockquote:italic
              prose-code:text-[var(--color-tech)] prose-code:bg-[var(--color-tech)]/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-[var(--color-surface)] prose-pre:border prose-pre:border-[var(--color-border)]
              prose-table:text-sm
              prose-th:text-[var(--color-text)] prose-th:font-semibold prose-th:text-right
              prose-td:text-[var(--color-text)]/70
              prose-li:text-[var(--color-text)]/80"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
          />

          <div className="mt-12 p-8 rounded-2xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 text-center">
            <p className="text-lg font-bold text-[var(--color-text)] mb-2">
              {t('blog.ctaTitle')}
            </p>
            <p className="text-sm text-[var(--color-text)]/50 mb-6">
              {t('blog.ctaDesc')}
            </p>
            <a
              href="/#contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white font-medium rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--color-accent)]/20"
            >
              {t('blog.ctaBtn')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}

function escapeMd(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderMarkdown(md) {
  return escapeMd(md)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      if (cells.every(c => c.trim().match(/^[-:]+$/))) return ''
      const tag = 'td'
      return `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`
    })
    .replace(/(<tr>.*<\/tr>\n?)+/gs, (match) => {
      const rows = match.trim().split('\n')
      const header = rows[0]
      const body = rows.slice(1).join('\n')
      return `<table><thead>${header}</thead><tbody>${body}</tbody></table>`
    })
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[a-z])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[23]>)/g, '$1')
    .replace(/(<\/h[23]>)<\/p>/g, '$1')
    .replace(/<p>(<blockquote>)/g, '$1')
    .replace(/(<\/blockquote>)<\/p>/g, '$1')
    .replace(/<p>(<table>)/g, '$1')
    .replace(/(<\/table>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
}
