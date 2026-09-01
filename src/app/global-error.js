'use client'

import dictionary from '@/lib/i18n/dictionary'

const t = dictionary.fa

export default function GlobalError({
  error,
  reset,
}) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>مشکلی پیش آمد!</h2>
          <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{t?.error?.description || 'خطایی رخ داد — لطفاً دوباره تلاش کنید'}</p>
          <button onClick={() => reset()}>تلاش دوباره</button>
        </div>
      </body>
    </html>
  )
}
