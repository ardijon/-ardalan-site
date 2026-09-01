import Header from '@/components/Header'
import Footer from '@/components/Footer'
import OrderTracker from '@/components/Store/OrderTracker'
import { SITE_URL, OG_IMAGE_STORE } from '@/lib/constants'

// This page used to declare only a title and a description, and inheriting the
// rest was not harmless: the root layout's `alternates.canonical` points at the
// site root, so every crawler was told this URL is a duplicate of the homepage.
// A canonical is a directive, not a hint — that one missing line was actively
// asking Google to drop the page. The social block was wrong for the same
// reason, showing the personal bio when someone shared the tracking link.
export const metadata = {
  title: 'پیگیری سفارش | فروشگاه',
  description: 'وضعیت سفارش خود را پیگیری کنید',
  openGraph: {
    title: 'پیگیری سفارش | فروشگاه اردلان پیری',
    description: 'با شماره موبایل و کد پیگیری، وضعیت سفارش خود را ببینید',
    url: `${SITE_URL}/store/track`,
    type: 'website',
    images: [OG_IMAGE_STORE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'پیگیری سفارش | فروشگاه اردلان پیری',
    description: 'با شماره موبایل و کد پیگیری، وضعیت سفارش خود را ببینید',
    images: [OG_IMAGE_STORE],
  },
  alternates: {
    canonical: `${SITE_URL}/store/track`,
  },
}

export default function TrackOrderPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="pt-32 sm:pt-36 pb-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block px-4 py-1.5 text-xs font-semibold tracking-widest text-[var(--color-accent)] bg-accent-soft-10 rounded-full border border-accent-soft-20">
                پیگیری سفارش
              </span>
              <h1 className="mt-6 text-3xl sm:text-4xl font-black text-[var(--color-primary)]">
                وضعیت سفارش خود را ببینید
              </h1>
              <p className="mt-4 text-lg text-text-soft-60">
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
