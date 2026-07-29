import Header from '@/components/Header'
import Footer from '@/components/Footer'
import StoreHero from '@/components/Store/StoreHero'
import ProductCard from '@/components/Store/ProductCard'
import GirihDivider from '@/components/GirihDivider'
import products from '@/lib/products'

export const metadata = {
  title: 'فروشگاه',
  description: 'قالب‌ها و ابزارهای حرفه‌ای برای شروع سریع کسب‌وکار',
}

export default function StorePage() {
  return (
    <>
      <Header />
      <main>
        <StoreHero />
        <GirihDivider />
        <section className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
