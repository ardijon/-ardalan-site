'use client'

import Link from 'next/link'
import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'
import articles, { getArticle } from '@/lib/articles'

// The blog's home. It used to be a teaser section on the landing page fed by a
// second copy of the posts in the dictionary; that copy could drift from the
// real articles. This reads the canonical `lib/articles` source instead, so the
// listing and the article pages can never disagree.
export default function BlogList() {
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [ref, visible] = useInView({ threshold: 0.05 })
  const posts = articles.map(a => getArticle(a.slug, locale))

  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
      <div
        ref={ref}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-accent-soft-10 rounded-full">
            {t('blog.badge')}
          </span>
          <h1 className="mt-6 text-[clamp(1.75rem,4vw,3rem)] font-black text-[var(--color-primary)] leading-tight text-balance">
            {t('blog.title')}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-text-soft-50 leading-relaxed">
            {t('blog.subtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ease ${i * 60}ms, transform 0.5s ease ${i * 60}ms`,
              }}
              className="group flex flex-col p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:shadow-lg hover:-translate-y-1 hover:border-accent-soft-25 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2 py-0.5 text-xs font-medium text-[var(--color-tech)] bg-tech-soft-10 rounded">
                  {post.cat}
                </span>
                <span className="text-xs text-text-soft-40">
                  {post.date}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors leading-relaxed">
                {post.title}
              </h2>
              <p className="mt-3 text-base text-text-soft-50 leading-relaxed line-clamp-3 flex-1">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-[var(--color-border)]">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
                  {t('blog.readMore')}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={isRtl ? 'scale-x-[-1]' : ''}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
                <span className="text-xs text-text-soft-40">
                  {post.readTime}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-14 p-8 rounded-2xl bg-accent-soft-5 border border-accent-soft-20 text-center">
          <p className="text-lg font-bold text-[var(--color-text)] mb-2">
            {t('blog.ctaTitle')}
          </p>
          <p className="text-sm text-text-soft-50 mb-6">
            {t('blog.ctaDesc')}
          </p>
          <Link
            href="/#contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white font-medium rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent-soft-20"
          >
            {t('blog.ctaBtn')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={isRtl ? 'scale-x-[-1]' : ''}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}