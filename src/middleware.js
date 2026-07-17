import { NextResponse } from 'next/server'

const SUPPORTED = ['fa', 'en']
const DEFAULT = 'fa'

export function middleware(request) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  const cookie = request.cookies.get('NEXT_LOCALE')?.value
  if (cookie && SUPPORTED.includes(cookie)) {
    const response = NextResponse.next()
    response.cookies.set('NEXT_LOCALE', cookie, { path: '/', maxAge: 31536000 })
    return response
  }

  const accept = request.headers.get('Accept-Language') || ''
  const preferred = accept.split(',')
    .map(s => s.split(';')[0].trim().slice(0, 2))
    .find(s => SUPPORTED.includes(s))

  const locale = preferred || DEFAULT
  const response = NextResponse.next()
  response.cookies.set('NEXT_LOCALE', locale, { path: '/', maxAge: 31536000 })
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
