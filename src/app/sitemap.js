import { getAllSlugs } from '@/lib/articles'
import { getLiveProducts } from '@/lib/products-server'
import { SITE_URL } from '@/lib/constants'

export default async function sitemap() {
  const baseUrl = SITE_URL

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    // No fragment URLs: /#about and friends are the SAME URL to a crawler —
    // six entries that were discarded as noise on ingestion. The homepage's
    // sections are reachable from the single / entry.
    { url: `${baseUrl}/store`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    // The blog listing is its own page now, not a #blog fragment on the homepage.
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  const blogPages = getAllSlugs().map(slug => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const storePages = (await getLiveProducts()).map(p => ({
    url: `${baseUrl}/store/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticPages, ...blogPages, ...storePages]
}
