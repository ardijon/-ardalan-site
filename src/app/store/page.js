import Header from '@/components/Header'
import Footer from '@/components/Footer'
import StoreHero from '@/components/Store/StoreHero'
import ProductCard from '@/components/Store/ProductCard'
import FeaturedProduct from '@/components/Store/FeaturedProduct'
import WhyUs from '@/components/Store/WhyUs'
import HowItWorks from '@/components/Store/HowItWorks'
import StoreCountdown from '@/components/Store/StoreCountdown'
import GirihDivider from '@/components/GirihDivider'
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
  const featuredProduct = products[0]

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
      price: p.pricing.pro.price,
      priceCurrency: 'IRR',
      availability: 'https://schema.org/InStock',
    })),
  }

  return (
    <>
      <Header />
      <main>
        <StoreHero />
        <FeaturedProduct product={featuredProduct} />
        <GirihDivider />
        <StoreCountdown />
        <section id="products" className="py-16 sm:py-20 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block px-4 py-1.5 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full border border-[var(--color-accent)]/20">
                ALL PRODUCTS
              </span>
              <h2 className="mt-6 text-3xl sm:text-4xl font-black text-[var(--color-primary)]">
                همه محصولات
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </div>
        </section>
        <GirihDivider />
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
