'use client'

import { useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/I18nProvider'

const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export default function ProjectModal({ project, onClose }) {
  const { t, dir } = useI18n()
  const isRtl = dir === 'rtl'
  const modalRef = useRef(null)
  const previousFocus = useRef(null)

  const trapFocus = useCallback((e) => {
    const modal = modalRef.current
    if (!modal) return
    const focusable = modal.querySelectorAll(focusableSelector)
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    const inModal = modal.contains(active)
    if (!e.shiftKey && (active === last || !inModal)) {
      e.preventDefault()
      first.focus()
    } else if (e.shiftKey && (active === first || !inModal)) {
      e.preventDefault()
      last.focus()
    }
  }, [])

  useEffect(() => {
    if (!project) return
    previousFocus.current = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('keydown', trapFocus)
    document.body.style.overflow = 'hidden'
    setTimeout(() => {
      const modal = modalRef.current
      if (modal) {
        const first = modal.querySelector(focusableSelector)
        if (first) first.focus()
      }
    }, 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('keydown', trapFocus)
      document.body.style.overflow = ''
      if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
        previousFocus.current.focus()
      }
    }
  }, [project, onClose, trapFocus])

  if (!project) return null

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full p-8 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} p-1.5 rounded-lg text-[var(--color-text)]/40 hover:text-[var(--color-text)] hover:bg-[var(--color-text)]/5 transition-all z-10`}
          aria-label={t('projectModal.close')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {project.image ? (
          <Image src={project.image} alt={project.title} width={600} height={176} className="w-full h-44 rounded-xl object-cover mb-6" />
        ) : (
          <div className={`w-full h-44 rounded-xl bg-gradient-to-br ${project.color} mb-6 opacity-80`} />
        )}

        <h3 id="modal-title" className="text-2xl font-bold text-[var(--color-text)]">{project.title}</h3>
        <span className="inline-block mt-2 px-3 py-1 text-xs font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
          {project.cat}
        </span>
        <p className="mt-4 text-sm text-[var(--color-text)]/60 leading-relaxed">
          {project.desc || t('projectModal.descPlaceholder')}
        </p>

        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 text-sm font-medium text-white bg-[var(--color-accent)] rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--color-accent)]/20"
          >
            {t('projectModal.viewProject')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}
