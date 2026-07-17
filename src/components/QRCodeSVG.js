'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function QRCodeSVG({ value, size = 100, alt }) {
  const [src, setSrc] = useState('')
  const { t } = useI18n()

  useEffect(() => {
    setSrc(
      `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(value)}&margin=12`
    )
  }, [value, size])

  if (!src) return <div style={{ width: size, height: size }} />

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || t('qr.scan')}
      width={size}
      height={size}
      className="rounded-lg"
      style={{ display: 'block' }}
    />
  )
}
