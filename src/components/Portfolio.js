'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useInView } from '@/hooks/useInView'
import { useI18n } from '@/lib/i18n/I18nProvider'
import ProjectModal from './ProjectModal'

const INITIAL_COUNT = 6

const projectStyles = [
  { color: 'from-[var(--color-primary)] to-[var(--color-tech)]' },
  { color: 'from-[var(--color-accent)] to-red-500' },
  { color: 'from-[var(--color-tech)] to-blue-500' },
  { color: 'from-purple-500 to-[var(--color-accent)]' },
  { color: 'from-[var(--color-accent)] to-[var(--color-tech)]' },
  { color: 'from-emerald-500 to-[var(--color-tech)]' },
]

const projectStoreLinks = {
  'سامانه جامع مشاوره و فروش بیمه': '/store/insurance-recruit-template',
  'Comprehensive Insurance Platform': '/store/insurance-recruit-template',
}

export default function Portfolio() {
  const { t, dir } = useI18n()
  const isRtl = dir === 'rtl'
  const [ref, visible] = useInView({ threshold: 0.08 })
  const [selected, setSelected] = useState(null)
  const [activeCategory, setActiveCategory] = useState(t('portfolio.categories')[0])
  const [showCount, setShowCount] = useState(INITIAL_COUNT)

  const categories = t('portfolio.categories')
  const projectData = t('portfolio.projects')

  const projects = useMemo(
    () => projectData.map((p, i) => ({ ...p, ...projectStyles[i % projectStyles.length] })),
    [projectData]
  )

  const filtered = useMemo(() => {
    if (activeCategory === categories[0]) return projects
    return projects.filter(p => p.cat === activeCategory)
  }, [activeCategory, projects, categories])

  const visibleProjects = filtered.slice(0, showCount)
  const hasMore = showCount < filtered.length

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat)
    setShowCount(INITIAL_COUNT)
  }

  return (
    <section id="portfolio" className="py-16 sm:py-20 lg:py-28 bg-[var(--color-surface)]/50 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
              {t('portfolio.badge')}
            </span>
            <h2 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black text-[var(--color-primary)]">
              {t('portfolio.title')}
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                  activeCategory === cat
                    ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20'
                    : 'bg-[var(--color-text)]/5 text-[var(--color-text)]/60 hover:bg-[var(--color-text)]/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleProjects.map((project, i) => {
              const storeLink = projectStoreLinks[project.title]
              return (
                <div
                  key={project.title}
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(24px)',
                    transition: `opacity 0.6s ease ${i * 100}ms, transform 0.6s ease ${i * 100}ms`,
                  }}
                  className={`group relative h-56 rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300 ${isRtl ? 'text-right' : 'text-left'} w-full`}
                >
                  {project.image ? (
                    <Image src={project.image} alt={project.title} fill className="object-cover group-hover:scale-105 transition-all duration-500" />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${project.color} opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500`} />
                  )}
                  <div className="absolute inset-0 bg-black/30" />

                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 text-xs font-medium text-white/80 bg-white/20 rounded-full backdrop-blur-sm">
                      {project.cat}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-bold text-white">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      {storeLink ? (
                        <Link
                          href={storeLink}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-[var(--color-accent)] rounded-full hover:bg-[var(--color-accent)]/90 transition-colors"
                        >
                          {t('store.buyNow')}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ) : (
                        <button
                          onClick={() => setSelected(project)}
                          className="inline-flex items-center gap-1.5 text-white/70 text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0"
                        >
                          <span>{t('portfolio.viewProject')}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {hasMore && (
            <div className="text-center mt-10">
              <button
                onClick={() => setShowCount(prev => prev + INITIAL_COUNT)}
                className="px-6 py-3 text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-xl hover:bg-[var(--color-accent)]/10 transition-all"
              >
                {t('portfolio.more')}
              </button>
            </div>
          )}
        </div>
      </div>

      {selected && <ProjectModal project={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
