'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Reveal-trigger hook: returns `[ref, visible]`.
 * `visible` flips to true once the element scrolls into view and stays true.
 * Disconnects the observer after the first reveal so it only fires once.
 *
 * @param {Object} options
 * @param {number} options.threshold - IntersectionObserver threshold (default 0.1)
 */
export function useInView({ threshold = 0.1 } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, visible]
}
