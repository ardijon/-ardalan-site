import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductClient from '@/components/Store/ProductClient'
import { getAllProducts } from '@/lib/products'
import { getLiveProduct, getLiveProducts } from '@/lib/products-server'
import { notFound } from 'next/navigation'
import { SITE_URL, OG_IMAGE_STORE } from '@/lib/constants'
import { jsonLd } from '@/lib/json-safe'
import { toRelatedSummary } from '@/lib/product-summary'

export async function generateStaticParams() {
  // Must stay on the build-time catalogue: this runs during the build, where
  // durable storage does not exist yet.
  const products = getAllProducts()
  return products.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const product = await getLiveProduct(slug)
  if (!product) return { title: '404' }

  const title = `${product.title.fa} | فروشگاه اردلان پیری`
  const description = product.shortDescription.fa

  return {
    title,
    description,
    keywords: [
      product.title.fa,
      product.title.en,
      product.shortTitle.fa,
      ...product.tech,
      'بیمه عمر',
      'فروشگاه',
    ],
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/store/${slug}`,
      type: 'website',
      // The empty-array branch used to be `[]`, which is why `/store/agent-site`
      // and `/store/rahyar` shared with no image anywhere: neither has screenshots
      // yet, and an empty list means Next emits no `og:image` *and* no
      // `twitter:image` — the twitter card borrows this list when its own is unset.
      images: product.screenshots?.[0]
        ? [{ url: product.screenshots[0].src, alt: product.screenshots[0].alt.fa }]
        : [OG_IMAGE_STORE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/store/${slug}`,
    },
  }
}

export default async function ProductPage({ params }) {
  const { slug } = await params
  const product = await getLiveProduct(slug)
  if (!product) notFound()

  // RelatedProducts used to receive the build-time catalogue, so a product added
  // from the admin panel stayed invisible until the next deploy. It now gets the
  // live catalogue — trimmed to the fields the related strip renders, because
  // shipping every product's full body (23 screenshots of copy each) across the
  // client boundary serialized ~37KB into every product page twice.
  const allProducts = await getLiveProducts()
  const relatedProducts = toRelatedSummary(allProducts)

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title.fa,
    description: product.description.fa,
    image: product.screenshots?.[0]?.src,
    brand: {
      '@type': 'Brand',
      name: product.shortTitle.fa,
    },
    offers: {
      '@type': 'Offer',
      // Toman on the site, Rial in the ISO currency code: ×10, or the structured
      // data reads every price ten times too low. A contact-mode product states
      // no price rather than price: 0 ("free").
      ...(product.pricing?.pro?.price || product.pricing?.starter?.price || product.priceSummary?.price
        ? {
            price: (product.pricing?.pro?.price || product.pricing?.starter?.price || product.priceSummary?.price) * 10,
            priceCurrency: 'IRR',
          }
        : {}),
      // An unreleased product is a pre-order; claiming InStock for something that
      // cannot be bought yet is exactly what Merchant listings get flagged for.
      availability: product.status === 'coming_soon'
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/InStock',
      seller: {
        '@type': 'Person',
        name: 'اردلان پیری',
      },
    },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'خانه',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'فروشگاه',
        item: `${SITE_URL}/store`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.shortTitle.fa,
        item: `${SITE_URL}/store/${slug}`,
      },
    ],
  }

  return (
    <>
      <Header />
      <ProductClient product={product} allProducts={relatedProducts} />
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
    </>
  )
}
