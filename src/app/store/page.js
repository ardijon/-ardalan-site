import Header from '@/components/Header'
import Footer from '@/components/Footer'
import StoreHero from '@/components/Store/StoreHero'
import ProductCard from '@/components/Store/ProductCard'
import WhyUs from '@/components/Store/WhyUs'
import HowItWorks from '@/components/Store/HowItWorks'
import products from '@/lib/products'
import { SITE_URL } from '@/lib/constants'

export const metadata = {
  title: 'فروشگاه | قالب‌ها و ابزارهای حرفه‌ای',
  description: 'قالب‌ها و ابزارهای حرفه‌ای Next.js برای شروع سریع کسب‌وکار — قالب جذب نماینده بیمه، فروشگاه آنلاین و ابزارهای هوش مصنوعی',
  keywords: ['فروشگاه', 'قالب Next.js', 'قالب وب‌سایت', 'ابزار هوش مصنوعی', 'قالب بیمه', 'توسعه نرم‌افزار'],
  openGraph: {
    title: 'فروشگاه | قالب‌ها و ابزارهای حرفه‌ای',
    description: 'قالب‌ها و ابزارهای حرفه‌ای برای شروع سریع کسب‌وکار',
    url: `${SITE_URL}/store`,
    type: 'website',
  },
  alternates: {
    canonical: `${SITE_URL}/store`,
  },
}

export default function StorePage() {
  const storeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'فروشگاه اردلان',
    description: 'قالب‌ها و ابزارهای حرفه‌ای برای شروع سریع کسب‌وکار',
    url: `${SITE_URL}/store`,
    seller: {
      '@type': 'Person',
      name: 'اردلان پیری',
    },
    offers: products.map(p => ({
      '@type': 'Offer',
      name: p.title.fa,
      description: p.shortDescription.fa,
      price: p.pricing?.pro?.price || 0,
      priceCurrency: 'IRR',
      availability: 'https://schema.org/InStock',
    })),
  }

  return (
    <>
      <Header />
      <main>
        <StoreHero />
        <section id="products" className="py-8 sm:py-12 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
              <h2 className="text-xl sm:text-2xl font-black text-[var(--color-primary)]">
                محصولات
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </div>
        </section>
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
