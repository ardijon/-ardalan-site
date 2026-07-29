import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductClient from '@/components/Store/ProductClient'
import { getProduct, getAllProducts } from '@/lib/products'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const products = getAllProducts()
  return products.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }) {
  const product = getProduct(params.slug)
  if (!product) return { title: '404' }

  return {
    title: product.title.fa,
    description: product.description.fa,
    openGraph: {
      title: product.title.fa,
      description: product.description.fa,
      type: 'website',
    },
  }
}

export default function ProductPage({ params }) {
  const product = getProduct(params.slug)
  if (!product) notFound()

  return (
    <>
      <Header />
      <ProductClient product={product} />
      <Footer />
    </>
  )
}
