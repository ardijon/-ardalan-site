'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ScreenshotGallery from '@/components/Store/ScreenshotGallery'
import GirihDivider from '@/components/GirihDivider'
import { getProduct } from '@/lib/products'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function DemoPage() {
  const { slug } = useParams()
  const { t, dir, locale } = useI18n()
  const isRtl = dir === 'rtl'

  const product = getProduct(slug)

  if (!product) {
    return (
      <>
        <Header />
        <main className="py-32 text-center">
          <h1 className="text-4xl font-bold text-[var(--color-primary)]">404</h1>
          <p className="mt-4 text-[var(--color-text)]/60">دمو پیدا نشد</p>
          <Link href="/store" className="inline-block mt-6 px-6 py-3 text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-xl hover:bg-[var(--color-accent)]/10 transition-colors">
            {t('store.backToStore')}
          </Link>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main>
        <section className="pt-28 sm:pt-32 pb-16 sm:pb-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <Link
              href={`/store/${product.slug}`}
              className={`inline-flex items-center gap-2 text-sm text-[var(--color-text)]/50 hover:text-[var(--color-accent)] transition-colors mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isRtl ? 'rotate-180' : ''}>
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              {t('store.backToStore')}
            </Link>

            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full">
                {t('store.viewDemo')}
              </span>
              <h1 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--color-primary)]">
                {product.title[locale] || product.title.en}
              </h1>
              <p className="mt-4 text-lg text-[var(--color-text)]/60">
                {t('store.screenshots')}
              </p>
            </div>
          </div>
        </section>

        <section className="pb-16 sm:pb-20">
          <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
            <ScreenshotGallery screenshots={product.screenshots} />
          </div>
        </section>

        <GirihDivider />

        <section className="py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">
              {isRtl ? 'علاقه‌مند شدید؟' : 'Interested?'}
            </h2>
            <p className="text-[var(--color-text)]/60 mb-8">
              {isRtl
                ? 'همین الان قالب رو برای کسب‌وکار خودتون تهیه کنید'
                : 'Get this template for your business right now'}
            </p>
            <Link
              href={`/store/${product.slug}`}
              className="inline-flex items-center gap-2 px-8 py-3 text-sm font-bold text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 transition-colors"
            >
              {t('store.buyNow')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
