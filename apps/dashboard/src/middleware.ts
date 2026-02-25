import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth pages - don't redirect if not logged in
  if (pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  // Check auth via cookie/header - client-side auth is handled in layout
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
