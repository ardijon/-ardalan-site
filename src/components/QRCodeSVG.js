'use client'

import QRCodeLocal from './QRCodeLocal'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function QRCodeSVG({ value, size = 100, alt }) {
  const { t } = useI18n()

  return (
    <QRCodeLocal
      value={value}
      size={size}
      alt={alt || t('store.qr.scan')}
    />
  )
}
