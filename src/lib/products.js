import productsData from '@/data/products.json'

const products = productsData

export function getProduct(slug) {
  return products.find(p => p.slug === slug)
}

export function getAllProducts() {
  return products
}

export default products
