import { SITE_URL } from '@/lib/constants'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // One rule group: two separate `User-agent: *` groups are merged by
        // Google but the contract is parser-dependent.
        disallow: '/admin',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
