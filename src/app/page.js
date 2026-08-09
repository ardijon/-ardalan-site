import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import GirihDivider from '@/components/GirihDivider'

// Dynamic imports for below-fold components to reduce initial bundle size
const About = dynamic(() => import('@/components/About'), {
  loading: () => <div className="h-96 skeleton" />,
  ssr: false,
})

const Services = dynamic(() => import('@/components/Services'), {
  loading: () => <div className="h-64 skeleton" />,
  ssr: false,
})

const Portfolio = dynamic(() => import('@/components/Portfolio'), {
  loading: () => <div className="h-64 skeleton" />,
  ssr: false,
})

const Resume = dynamic(() => import('@/components/Resume'), {
  loading: () => <div className="h-64 skeleton" />,
  ssr: false,
})

const Blog = dynamic(() => import('@/components/Blog'), {
  loading: () => <div className="h-64 skeleton" />,
  ssr: false,
})

const Contact = dynamic(() => import('@/components/Contact'), {
  loading: () => <div className="h-64 skeleton" />,
  ssr: false,
})

const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <div className="h-48 skeleton" />,
  ssr: false,
})

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <GirihDivider />
        <Suspense fallback={<div className="h-96 skeleton" />}>
          <About />
        </Suspense>
        <GirihDivider />
        <Suspense fallback={<div className="h-64 skeleton" />}>
          <Services />
        </Suspense>
        <GirihDivider />
        <Suspense fallback={<div className="h-64 skeleton" />}>
          <Portfolio />
        </Suspense>
        <GirihDivider />
        <Suspense fallback={<div className="h-64 skeleton" />}>
          <Resume />
        </Suspense>
        <GirihDivider />
        <Suspense fallback={<div className="h-64 skeleton" />}>
          <Blog />
        </Suspense>
        <GirihDivider />
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
