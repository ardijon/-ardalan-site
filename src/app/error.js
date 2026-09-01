'use client'

import dictionary from '@/lib/i18n/dictionary'

const t = dictionary.fa

export default function Error({ error, reset }) {
  return (
    <div dir="rtl" lang="fa" style={{ padding: '20px', textAlign: 'center', fontFamily: 'Vazirmatn, sans-serif' }}>
      <h2>مشکلی پیش آمد!</h2>
      <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{t?.error?.description || 'خطایی رخ داد — لطفاً دوباره تلاش کنید'}</p>
      <button onClick={() => reset()}>تلاش دوباره</button>
    </div>
  )
}
