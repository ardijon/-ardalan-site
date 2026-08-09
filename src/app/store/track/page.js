import Header from '@/components/Header'
import Footer from '@/components/Footer'
import OrderTracker from '@/components/Store/OrderTracker'

export const metadata = {
  title: 'پیگیری سفارش | فروشگاه',
  description: 'وضعیت سفارش خود را پیگیری کنید',
}

export default function TrackOrderPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="pt-32 sm:pt-36 pb-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block px-4 py-1.5 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-full border border-[var(--color-accent)]/20">
                پیگیری سفارش
              </span>
              <h1 className="mt-6 text-3xl sm:text-4xl font-black text-[var(--color-primary)]">
                وضعیت سفارش خود را ببینید
              </h1>
              <p className="mt-4 text-lg text-[var(--color-text)]/60">
                شماره موبایل و کد پیگیری سفارش خود را وارد کنید
              </p>
            </div>

            <OrderTracker />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
