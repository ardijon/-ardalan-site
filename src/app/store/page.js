import Header from '@/components/Header'
import Footer from '@/components/Footer'
import StoreHero from '@/components/Store/StoreHero'
import ProductLadder from '@/components/Store/ProductLadder'
import WhyUs from '@/components/Store/WhyUs'
import HowItWorks from '@/components/Store/HowItWorks'
import { getLiveProducts } from '@/lib/products-server'
import { SITE_URL, OG_IMAGE_STORE } from '@/lib/constants'
import { jsonLd } from '@/lib/json-safe'

export const metadata = {
  title: 'فروشگاه | ابزارهای نرم‌افزاری',
  description: 'ابزارهایی که از نیاز واقعی شروع شدن — از بیمه تا هر صنعتی',
  keywords: ['توانا', 'رهیار', 'نرم‌افزار صنعتی', 'ابزار هوش مصنوعی', 'اتوماسیون'],
  openGraph: {
    title: 'فروشگاه | ابزارهای نرم‌افزاری',
    description: 'ابزارهایی که از نیاز واقعی شروع شدن — از بیمه تا هر صنعتی',
    url: `${SITE_URL}/store`,
    type: 'website',
    images: [OG_IMAGE_STORE],
  },
  // Not duplication of the root layout: Next inherits the parent's `twitter`
  // block only while a child omits it *entirely*. This file defined `openGraph`
  // but no `twitter`, so the store's card on X carried the personal bio —
  // instead of a word about the store. Deleting this block brings that back.
  twitter: {
    card: 'summary_large_image',
    title: 'فروشگاه | ابزارهای نرم‌افزاری',
    description: 'ابزارهایی که از نیاز واقعی شروع شدن — از بیمه تا هر صنعتی',
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
    description: 'ابزارهایی که از نیاز واقعی شروع شدن',
    url: `${SITE_URL}/store`,
    seller: {
      '@type': 'Person',
      name: 'اردلان پیری',
    },
    offers: products.map(p => {
      // Toman on the site, Rial in the currency code: schema.org needs ISO 4217,
      // where Iran's unit is IRR. 1 Toman = 10 Rial, so the number must be
      // converted — the old code shipped Toman numbers under an IRR label and
      // every consumer of the data read prices 10× too low. Contact-mode
      // products have no price and get none (price: 0 reads as "free").
      const tomanPrice = p.pricing?.pro?.price || p.pricing?.starter?.price || p.priceSummary?.price || null
      return {
        '@type': 'Offer',
        name: p.title.fa,
        description: p.shortDescription.fa,
        // A product still in development is a pre-order, not stock on a shelf —
        // an InStock offer nobody can buy is the kind of thing Google penalises.
        availability: p.status === 'coming_soon'
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/InStock',
        ...(tomanPrice ? { price: tomanPrice * 10, priceCurrency: 'IRR' } : {}),
      }
    }),
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
        dangerouslySetInnerHTML={{ __html: jsonLd(storeSchema) }}
      />
    </>
  )
}
