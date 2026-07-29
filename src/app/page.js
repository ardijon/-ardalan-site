import Header from '@/components/Header'
import Hero from '@/components/Hero'
import About from '@/components/About'
import Services from '@/components/Services'
import Portfolio from '@/components/Portfolio'
import StoreSection from '@/components/Store/StoreSection'
import Resume from '@/components/Resume'
import Blog from '@/components/Blog'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'
import GirihDivider from '@/components/GirihDivider'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <GirihDivider />
        <About />
        <GirihDivider />
        <Services />
        <GirihDivider />
        <Portfolio />
        <GirihDivider />
        <StoreSection />
        <GirihDivider />
        <Resume />
        <GirihDivider />
        <Blog />
        <GirihDivider />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
