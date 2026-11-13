import { useEffect } from 'react'
import { matchRoute, useLocation } from './router/router'
import { LandingPage } from './landing/landing-page'
import { PlayPage } from './pages/play-page'
import { NotFound } from './pages/not-found'
import { Toaster } from './components/ui/toast'
import { initHubBridge } from './lib/hub-bridge'

export function App() {
  const { pathname } = useLocation()
  const route = matchRoute(pathname)

  useEffect(() => initHubBridge(), [])

  useEffect(() => {
    if (route.name === 'home') document.title = 'Gamexamxi — Kho game cho học sinh'
    if (route.name === 'not-found') document.title = 'Không tìm thấy trang — Gamexamxi'
  }, [route.name])

  return (
    <>
      {route.name === 'home' && <LandingPage />}
      {route.name === 'play' && <PlayPage key={route.gameId} gameId={route.gameId} />}
      {route.name === 'not-found' && <NotFound />}
      <Toaster />
    </>
  )
}
