'use client'

import Link from 'next/link'
import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function Blog() {
  const { t } = useI18n()
  const [ref, visible] = useInView({ threshold: 0.08 })
  const articles = t('blog.articles')

  return (
    <section id="blog" className="py-16 sm:py-20 lg:py-28 bg-[var(--color-surface)]/50 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
              {t('blog.badge')}
            </span>
            <h2 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black text-[var(--color-primary)]">
              {t('blog.title')}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((post, i) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.6s ease ${i * 120}ms, transform 0.6s ease ${i * 120}ms`,
                }}
                className="group p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2 py-0.5 text-xs font-medium text-[var(--color-tech)] bg-[var(--color-tech)]/10 rounded">
                    {post.cat}
                  </span>
                  <span className="text-xs text-[var(--color-text)]/40">
                    {post.date}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors leading-relaxed">
                  {post.title}
                </h3>
                <p className="mt-3 text-sm text-[var(--color-text)]/50 leading-relaxed line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-2 mt-4 text-sm text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                  <span>{t('blog.readMore')}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
