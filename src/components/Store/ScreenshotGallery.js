'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function ScreenshotGallery({ screenshots }) {
  const { dir, locale } = useI18n()
  const isRtl = dir === 'rtl'
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const lightboxRef = useRef(null)
  const mainImageRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousButtonRef = useRef(null)
  const minDistance = 50

  const altText = (shot) => shot.alt?.[locale] || shot.alt?.en || ''

  const goTo = useCallback((index) => {
    setActiveIndex((prev) => {
      const next = index < 0 ? screenshots.length - 1 : index >= screenshots.length ? 0 : index
      return next
    })
  }, [screenshots.length])

  const openLightbox = useCallback((index) => {
    setActiveIndex(index)
    setLightboxOpen(true)
    setTouchStart(null)
    setTouchEnd(null)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    setTouchStart(null)
    setTouchEnd(null)
  }, [])

  // Focus trap for lightbox
  useEffect(() => {
    if (!lightboxOpen) return

    const lightbox = lightboxRef.current
    if (!lightbox) return

    const focusableElements = lightbox.querySelectorAll(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    function handleTabKey(e) {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    // Focus the close button on mount
    closeButtonRef.current?.focus()

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [lightboxOpen])

  const handleKeyDown = useCallback((e) => {
    if (!lightboxOpen) return
    if (e.key === 'Escape') closeLightbox()
    // In RTL: ArrowLeft = forward (next), ArrowRight = backward (prev)
    // In LTR: ArrowLeft = backward (prev), ArrowRight = forward (next)
    else if (e.key === 'ArrowLeft') goTo(isRtl ? activeIndex + 1 : activeIndex - 1)
    else if (e.key === 'ArrowRight') goTo(isRtl ? activeIndex - 1 : activeIndex + 1)
  }, [lightboxOpen, activeIndex, closeLightbox, goTo, isRtl])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [lightboxOpen])

  // Wheel navigation removed: hijacking the wheel over the hero image trapped
  // the page scroll — a desktop user resting the cursor on the image and
  // scrolling down the PAGE cycled screenshots instead. Arrows, swipe, the
  // thumbnail strip and the keyboard already cover every way to move.
  void mainImageRef

  const onTouchStart = (e) => { setTouchStart(e.targetTouches[0].clientX) }
  const onTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX) }
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    if (Math.abs(distance) < minDistance) return
    // In RTL: swipe left (positive distance) = forward, swipe right = backward
    // In LTR: swipe left (positive distance) = backward, swipe right = forward
    if (isRtl) {
      if (distance > 0) goTo(activeIndex + 1)
      else goTo(activeIndex - 1)
    } else {
      if (distance > 0) goTo(activeIndex - 1)
      else goTo(activeIndex + 1)
    }
    setTouchStart(null)
    setTouchEnd(null)
  }

  if (!screenshots || screenshots.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Main image with navigation arrows */}
      <div
        ref={mainImageRef}
        className="relative rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] cursor-zoom-in group select-none"
        onClick={() => openLightbox(activeIndex)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Navigation arrows on main image.
            Labels follow the ACTION, never the mirrored position: the button
            that calls goTo(-1) is always «قبلی», because a screen-reader user
            activating "بعدی" and landing on an earlier slide is a silent lie —
            the chevron glyph can mirror, the meaning cannot. */}
        {screenshots.length > 1 && (
          <>
            <button
              className="absolute start-2 sm:start-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white shadow-lg transition-all"
              onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1) }}
              aria-label={isRtl ? 'قبلی' : 'Previous'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points={isRtl ? '9 18 15 12 9 6' : '15 18 9 12 15 6'} />
              </svg>
            </button>
            <button
              className="absolute end-2 sm:end-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white shadow-lg transition-all"
              onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1) }}
              aria-label={isRtl ? 'بعدی' : 'Next'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points={isRtl ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
              </svg>
            </button>
          </>
        )}

        {/*
          max-h caps the image against the *viewport*, which is the whole point of
          rotating a phone. Without it `w-full h-auto` makes a 3:2 shot 505px tall in
          a 375px-tall landscape window: turning the phone sideways to see the picture
          bigger showed strictly less of it. `svh` and not `vh` so a mobile URL bar
          appearing does not reflow the page, and not `dvh` so it does not animate.
          object-contain letterboxes the difference against the surface colour.
        */}
        <Image
          src={screenshots[activeIndex].src}
          alt={altText(screenshots[activeIndex])}
          width={1200}
          height={800}
          sizes="(max-width: 768px) 100vw, 70vw"
          className="w-full h-auto max-h-[70svh] object-contain transition-transform duration-200 group-hover:scale-[1.01]"
          priority
        />

        {/* Image counter */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
          {activeIndex + 1} / {screenshots.length}
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center pointer-events-none">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-auto">
            {isRtl ? 'بزرگ‌نمایی' : 'Zoom'}
          </span>
        </div>
      </div>

      {/*
        Thumbnail strip. Hidden on portrait phones, which means a landscape phone gets
        it — `sm:` is a width query and a rotated phone is 812px wide.

        This strip cannot contain itself: a nowrap flex row of N thumbnails has a
        min-content width of N × 96px, and `overflow-x: auto` makes it scrollable
        without making it shrinkable. Whatever flex or grid item this component sits
        in has to carry `min-w-0`, or that min-content propagates all the way up and
        the strip's width becomes the page's width. See the note in ProductClient.
      */}
      <div className="hidden sm:block relative">
        <div
          className="flex gap-2 overflow-x-auto pb-2 px-10 scroll-smooth"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-accent) transparent' }}
        >
          {screenshots.map((shot, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                i === activeIndex
                  ? 'border-[var(--color-accent)] shadow-lg scale-105 ring-2 ring-accent-soft-30'
                  : 'border-[var(--color-border)] opacity-65 hover:opacity-100 hover:scale-105'
              }`}
            >
              <Image
                src={shot.src}
                alt={altText(shot)}
                fill
                sizes="96px"
                className="object-contain bg-[var(--color-bg)]"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={isRtl ? 'نمایشگر اسکرین‌شات' : 'Screenshot viewer'}
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
          onClick={(e) => { if (e.target === lightboxRef.current) closeLightbox() }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 short:py-1.5 border-b border-white/10">
            <span className="text-white/60 text-sm font-mono">
              {activeIndex + 1} / {screenshots.length}
            </span>
            <button
              ref={closeButtonRef}
              onClick={closeLightbox}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label={isRtl ? 'بستن' : 'Close'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/*
            Main image. The `short:` overrides exist because a landscape phone is the
            one case where the lightbox is worse than the page it covers: two 57px bars
            plus 64px of `sm:p-8` left a 375px-tall window only ~197px of image. The
            bars are what makes it navigable, so the padding gives way instead.
          */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8 short:p-2 overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <Image
              src={screenshots[activeIndex].src}
              alt={altText(screenshots[activeIndex])}
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 px-4 py-3 short:py-1.5">
            <div className="flex items-center justify-between gap-3">
              {/* Prev — labeled by action: this button goes back, always. */}
              <button
                ref={previousButtonRef}
                onClick={() => goTo(activeIndex - 1)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={activeIndex === 0}
                aria-label={isRtl ? 'قبلی' : 'Previous'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/*
                min-w-0 for the same reason as the product grid: `flex-1` leaves
                `min-width: auto`, so this item refuses to shrink below the 1648px
                min-content of its own thumbnail row and shoves the Next button off
                the screen. overflow-x-auto is not enough on its own — it makes the
                box scrollable, not shrinkable.
              */}
              <div className="flex gap-2 overflow-x-auto flex-1 min-w-0 pb-1" style={{ scrollbarWidth: 'none' }}>
                {screenshots.map((shot, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`relative shrink-0 w-16 h-10 rounded overflow-hidden border transition-all ${
                      i === activeIndex
                        ? 'border-white ring-1 ring-white/50'
                        : 'border-white/20 opacity-50 hover:opacity-80'
                    }`}
                  >
                    <Image
                      src={shot.src}
                      alt={altText(shot)}
                      fill
                      sizes="64px"
                      className="object-contain"
                    />
                  </button>
                ))}
              </div>

              {/* Next — labeled by action: forward, always. */}
              <button
                onClick={() => goTo(activeIndex + 1)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={activeIndex === screenshots.length - 1}
                aria-label={isRtl ? 'بعدی' : 'Next'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
