'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function ScreenshotGallery({ screenshots }) {
  const { dir, locale } = useI18n()
  const [activeIndex, setActiveIndex] = useState(0)

  if (!screenshots || screenshots.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Image
          src={screenshots[activeIndex].src}
          alt={screenshots[activeIndex].alt[locale] || screenshots[activeIndex].alt.en}
          fill
          className="object-contain p-2"
          priority
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {screenshots.map((shot, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`relative shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
              i === activeIndex
                ? 'border-[var(--color-accent)] shadow-md'
                : 'border-[var(--color-border)] opacity-60 hover:opacity-100'
            }`}
          >
            <Image
              src={shot.src}
              alt={shot.alt[locale] || shot.alt.en}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
