import { SITE_URL } from '@/lib/constants'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: '*',
        disallow: '/admin',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
