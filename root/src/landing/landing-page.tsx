import { useCallback } from 'react'
import { navigate, useLocation } from '@/router/router'
import { isCatalogFilter, type CatalogFilter } from './game-registry'
import { NavBar } from './sections/nav-bar'
import { Hero } from './sections/hero'
import { Catalog } from './sections/catalog'
import { About } from './sections/about'
import { Contact } from './sections/contact'
import { Footer } from './sections/footer'
import './landing.css'

export function LandingPage() {
  const { search } = useLocation()
  const param = new URLSearchParams(search).get('loc')
  const filter: CatalogFilter = isCatalogFilter(param) ? param : 'all'

  const setFilter = useCallback((next: CatalogFilter, scrollToCatalog = false) => {
    const url = new URL(window.location.href)
    if (next === 'all') url.searchParams.delete('loc')
    else url.searchParams.set('loc', next)
    url.hash = scrollToCatalog ? 'kho-game' : ''
    navigate(url.pathname + url.search + url.hash, { replace: true, scroll: false })
  }, [])

  return (
    <div className="landing">
      <NavBar filter={filter} onFilter={(f) => setFilter(f, true)} />
      <main className="landing__main">
        <Hero />
        <Catalog filter={filter} onFilter={setFilter} />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
