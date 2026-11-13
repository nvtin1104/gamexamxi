import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/**
 * Router tối giản dựa trên History API.
 * Cloudflare Pages phục vụ index.html cho mọi đường dẫn nhờ `public/_redirects`.
 */

const NAV_EVENT = 'gx:navigate'

function subscribe(callback: () => void): () => void {
  window.addEventListener('popstate', callback)
  window.addEventListener(NAV_EVENT, callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener(NAV_EVENT, callback)
  }
}

const getHref = () => window.location.pathname + window.location.search

export function useLocation(): { pathname: string; search: string } {
  const href = useSyncExternalStore(subscribe, getHref, () => '/')
  const url = new URL(href, 'http://local')
  return { pathname: url.pathname, search: url.search }
}

export function navigate(to: string, options: { replace?: boolean; scroll?: boolean } = {}): void {
  const { replace = false, scroll = true } = options
  const url = new URL(to, window.location.origin)
  const samePage = url.pathname === window.location.pathname

  if (url.href !== window.location.href) {
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    window.dispatchEvent(new Event(NAV_EVENT))
  }

  if (url.hash) {
    // Đợi React render route mới rồi mới cuộn tới anchor
    requestAnimationFrame(() => {
      document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  } else if (scroll && !samePage) {
    window.scrollTo({ top: 0 })
  }
}

export type Route = { name: 'home' } | { name: 'play'; gameId: string } | { name: 'not-found' }

export function matchRoute(pathname: string): Route {
  const clean = pathname.replace(/\/+$/, '') || '/'
  if (clean === '/') return { name: 'home' }
  const play = /^\/play\/([a-z0-9-]+)$/.exec(clean)
  if (play?.[1]) return { name: 'play', gameId: play[1] }
  return { name: 'not-found' }
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

/** Link nội bộ: giữ `<a href>` thật (mở tab mới, SEO), chặn reload khi click thường. */
export function Link({ href, onClick, ...rest }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      rest.target === '_blank'
    ) {
      return
    }
    event.preventDefault()
    navigate(href)
  }
  return <a href={href} onClick={handleClick} {...rest} />
}
