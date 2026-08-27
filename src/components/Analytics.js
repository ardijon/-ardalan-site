'use client'

import { usePathname } from 'next/navigation'
import { CF_BEACON_TOKEN } from '@/lib/constants'

/**
 * Cloudflare Web Analytics beacon.
 *
 * WHY THIS IS INSTALLED BY HAND
 * -----------------------------
 * Cloudflare can inject the beacon automatically, but its own documentation
 * notes the injection is skipped when a response carries
 * `Cache-Control: public, no-transform` — and OpenNext sets the cache headers on
 * this site. Automatic injection would fail silently, which is the worst failure
 * mode available: weeks of believing data is being collected while it is not.
 *
 * WHY NOT next/script
 * -------------------
 * Cloudflare's snippet is `type="module"`. `next/script` loads its `src` as a
 * classic script, and an ES module evaluated as a classic script can throw. The
 * tag is written literally so it stays exactly what Cloudflare tested.
 *
 * WHY A CLIENT COMPONENT
 * ----------------------
 * Only for `usePathname`, so the admin panel is excluded — the owner's own
 * clicks would otherwise be counted as traffic, and the panel's paths would show
 * up as popular pages. It still server-renders on every public route, so the
 * beacon is in the initial HTML rather than waiting on hydration.
 */
export default function Analytics() {
  const pathname = usePathname()

  // Kept out of development so a local run never pollutes the real numbers.
  if (process.env.NODE_ENV !== 'production') return null
  if (!CF_BEACON_TOKEN) return null
  if (pathname?.startsWith('/admin')) return null

  return (
    <script
      type="module"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      // `defer` has no effect on a module script — they are deferred by
      // definition, which is why Cloudflare's own snippet omits it. It is here
      // only because @next/next/no-sync-scripts looks for the attribute rather
      // than at the type, and silencing that rule with a disable comment would
      // also silence it for whatever this file grows into later.
      defer
      data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN })}
    />
  )
}
