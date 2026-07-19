'use client'

import Hero from './Hero'
import About from './About'
import Services from './Services'
import Portfolio from './Portfolio'
import Resume from './Resume'
import Blog from './Blog'
import Contact from './Contact'
import GirihDivider from './GirihDivider'

export default function HomeContent() {
  return (
    <main>
      <Hero />
      <GirihDivider />
      <About />
      <GirihDivider />
      <Services />
      <GirihDivider />
      <Portfolio />
      <GirihDivider />
      <Resume />
      <GirihDivider />
      <Blog />
      <GirihDivider />
      <Contact />
    </main>
  )
}
