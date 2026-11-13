import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import GirihDivider from '@/components/GirihDivider'
import ValueBand from '@/components/ValueBand'
import { getAllProducts } from '@/lib/products'
import { toLadderSummary } from '@/lib/product-summary'

// A server component, deliberately. The `"use client"` that used to be on line 1
// was not a choice — `ssr: false` is only legal in a client component, and once
// that option came off the eight imports below there was nothing left needing the
// browser here. Every child declares its own `'use client'`; GirihDivider needs
// none. Keeping the directive would block the catalogue read in Home().

// Dynamic imports for below-fold components to reduce initial bundle size.
//
// Deliberately WITHOUT `ssr: false`. These sections carry every word of
// content on the page, and `ssr: false` kept all of it out of the server HTML —
// Googlebot, and every link-preview bot that does not run JavaScript, saw the
// hero and empty skeleton divs. Code splitting survives here without it;
// only the server render was being thrown away. Re-adding `ssr: false` would
// make the page invisible again, so `__tests__/homepage-ssr.test.js` guards it.
//
// Safe to server-render because none of them touch `window`/`document`/
// storage at module or render time, and I18nProvider starts at `useState('fa')`
// and only reads localStorage inside an effect — so the server and the client's
// first render agree and there is no hydration mismatch to trade for the SEO.
const About = dynamic(() => import('@/components/About'), {
  loading: () => <div className="h-96 skeleton" />,
})

const Services = dynamic(() => import('@/components/Services'), {
  loading: () => <div className="h-64 skeleton" />,
})

// The bridge from the personal landing into the store. Sits directly after
// About: the bio is the proof, so the products come while that proof is still
// on screen.
const Products = dynamic(() => import('@/components/Products'), {
  loading: () => <div className="h-64 skeleton" />,
})

const Contact = dynamic(() => import('@/components/Contact'), {
  loading: () => <div className="h-64 skeleton" />,
})

const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <div className="h-48 skeleton" />,
})

export default function Home() {
  // Read here, not inside Products: this file stays on the server, so the 37 KB
  // catalogue never crosses to the client — only the trimmed rows do. Without
  // this, `Products` had to fetch its own data in an effect and the three cards
  // were absent from the server HTML entirely.
  //
  // Build-time catalogue on purpose. The homepage prerenders, so reading live
  // storage here would resolve at build time anyway and only make Home() async
  // for nothing. Products added from the admin panel arrive on the client, where
  // the section's refresh effect picks them up.
  const ladder = toLadderSummary(getAllProducts())

  return (
    <>
      <Header />
      <main>
        <Hero />
        <GirihDivider />
        <Suspense fallback={<div className="h-96 skeleton" />}>
          <About />
        </Suspense>
        <Suspense fallback={<div className="h-64 skeleton" />}>
          <Products initialProducts={ladder} />
        </Suspense>
        <ValueBand />
        <Suspense fallback={<div className="h-64 skeleton" />}>
          <Services />
        </Suspense>
        <Suspense fallback={<div className="h-64 skeleton" />}>
          <Contact />
        </Suspense>
      </main>
      <Suspense fallback={<div className="h-48 skeleton" />}>
        <Footer />
      </Suspense>
    </>
  )
}
