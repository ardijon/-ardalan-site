export const SITE_URL = 'https://ai2apps.sbs'

// The link-preview card for every store page that has no image of its own.
//
// Shared from here because three separate files need the identical value: Next
// *replaces* a parent's `openGraph`/`twitter` block when a child defines one, it
// does not merge them, so each store page has to restate the image or end up
// with none at all. `/store` was serving no `og:image` for exactly that reason.
//
// The URL stays relative — `metadataBase` in the root layout makes it absolute.
export const OG_IMAGE_STORE = {
  url: '/og-store.jpg',
  width: 1200,
  height: 630,
  alt: 'فروشگاه اردلان پیری — ابزارهای دیجیتال صنعت بیمه عمر',
}

// Cloudflare Web Analytics site token.
//
// Committed on purpose, and not a secret: the beacon script carries it in the
// served HTML, so every visitor already has it. It identifies which site a
// pageview belongs to and grants nothing — there is no read access behind it.
// Putting it in `wrangler secret` would only hide it from the repository while
// publishing it on every page, which is the worst of both.
//
// Google Analytics was rejected for this job rather than added alongside: its
// script is filtered for visitors inside Iran, so the data would be missing
// exactly the audience this site has, and the failed request costs load time.
export const CF_BEACON_TOKEN = '485fc9538db6459695352db46e0e99d5'
