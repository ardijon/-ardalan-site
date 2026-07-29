import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductClient from '@/components/Store/ProductClient'
import { getProduct, getAllProducts } from '@/lib/products'
import { notFound } from 'next/navigation'
import { SITE_URL } from '@/lib/constants'

export async function generateStaticParams() {
  const products = getAllProducts()
  return products.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }) {
  const product = getProduct(params.slug)
  if (!product) return { title: '404' }

  const title = `${product.title.fa} | فروشگاه اردلان`
  const description = product.shortDescription.fa

  return {
    title,
    description,
    keywords: [
      product.title.fa,
      product.title.en,
      ...product.tech,
      'قالب Next.js',
      'فروشگاه',
      'دانلود قالب',
    ],
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/store/${params.slug}`,
      type: 'website',
      images: product.screenshots?.[0]
        ? [{ url: product.screenshots[0].src, alt: product.screenshots[0].alt.fa }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/store/${params.slug}`,
    },
  }
}

export default function ProductPage({ params }) {
  const product = getProduct(params.slug)
  if (!product) notFound()

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title.fa,
    description: product.description.fa,
    image: product.screenshots?.[0]?.src,
    brand: {
      '@type': 'Brand',
      name: 'اردلان',
    },
    offers: {
      '@type': 'Offer',
      price: product.pricing.pro.price,
      priceCurrency: 'IRR',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Person',
        name: 'اردلان پیری',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      reviewCount: '1',
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
        name: product.title.fa,
        item: `${SITE_URL}/store/${params.slug}`,
      },
    ],
  }

  return (
    <>
      <Header />
      <ProductClient product={product} />
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  )
}
