import Header from '@/components/Header'
import Footer from '@/components/Footer'
import StoreHero from '@/components/Store/StoreHero'
import ProductLadder from '@/components/Store/ProductLadder'
import WhyUs from '@/components/Store/WhyUs'
import HowItWorks from '@/components/Store/HowItWorks'
import { getLiveProducts } from '@/lib/products-server'
import { SITE_URL, OG_IMAGE_STORE } from '@/lib/constants'

export const metadata = {
  title: 'فروشگاه | ابزارهای دیجیتال صنعت بیمه عمر',
  description: 'ابزارهای دیجیتال صنعت بیمه عمر — از سایت اختصاصی یک نماینده تا سامانه‌ی جذب و توسعه‌ی نیروی فروش یک شرکت بیمه',
  keywords: ['جذب نماینده بیمه', 'سایت نماینده بیمه', 'سیستم استخدام', 'توانا', 'رهیار', 'بیمه عمر', 'ابزار هوش مصنوعی'],
  openGraph: {
    title: 'فروشگاه | ابزارهای دیجیتال صنعت بیمه عمر',
    description: 'از یک نماینده تا یک شرکت بیمه — سه ابزار برای سه اندازه از کار',
    url: `${SITE_URL}/store`,
    type: 'website',
    images: [OG_IMAGE_STORE],
  },
  // Not duplication of the root layout: Next inherits the parent's `twitter`
  // block only while a child omits it *entirely*. This file defined `openGraph`
  // but no `twitter`, so the store's card on X carried the personal bio —
  // «توسعه‌دهنده نرم‌افزار | متخصص هوش مصنوعی | ... | مشاور بیمه» — instead of a
  // word about the store. Deleting this block brings that back.
  twitter: {
    card: 'summary_large_image',
    title: 'فروشگاه | ابزارهای دیجیتال صنعت بیمه عمر',
    description: 'از یک نماینده تا یک شرکت بیمه — سه ابزار برای سه اندازه از کار',
    images: [OG_IMAGE_STORE],
  },
  alternates: {
    canonical: `${SITE_URL}/store`,
  },
}

export default async function StorePage() {
  // Live catalogue so admin edits appear here; falls back to the build-time
  // JSON when storage is empty, which is also what happens during prerender.
  const products = await getLiveProducts()

  const storeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'فروشگاه اردلان پیری',
    description: 'ابزارهای دیجیتال صنعت بیمه عمر',
    url: `${SITE_URL}/store`,
    seller: {
      '@type': 'Person',
      name: 'اردلان پیری',
    },
    offers: products.map(p => ({
      '@type': 'Offer',
      name: p.title.fa,
      description: p.shortDescription.fa,
      // A product still in development is a pre-order, not stock on a shelf —
      // an InStock offer nobody can buy is the kind of thing Google penalises.
      availability: p.status === 'coming_soon'
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/InStock',
      price: p.pricing?.pro?.price || p.pricing?.starter?.price || p.priceSummary?.price || 0,
      priceCurrency: 'IRR',
    })),
  }

  return (
    <>
      <Header />
      <main>
        <StoreHero />
        <ProductLadder products={products} />
        <WhyUs />
        <HowItWorks />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema) }}
      />
    </>
  )
}
