import { NextResponse } from 'next/server'
import { rateLimit, getRateLimitHeaders } from './lib/rateLimit'

export function middleware(request) {
  const pathname = request.nextUrl.pathname
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  
  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const allowed = rateLimit(clientIP, 100, 60000) // 100 requests per minute
    const headers = getRateLimitHeaders(clientIP, 100, 60000)
    
    if (!allowed) {
      return new NextResponse('Rate limit exceeded', { 
        status: 429, 
        headers 
      })
    }
    
    // Add rate limit headers to response
    const response = NextResponse.next()
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }

  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return NextResponse.next()
  }

  // Skip CSRF for API routes that don't need it (like webhooks)
  if (pathname.startsWith('/api/webhooks/')) {
    return NextResponse.next()
  }

  // Check for CSRF token in headers
  const csrfToken = request.headers.get('x-csrf-token') || 
                   request.headers.get('x-requested-with')

  // Allow requests with proper CSRF headers
  if (csrfToken === 'XMLHttpRequest' || csrfToken) {
    return NextResponse.next()
  }

  // Check origin/referer for same-origin requests
  const referer = request.headers.get('referer')
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  // Allow same-origin requests
  if (referer && new URL(referer).host === host) {
    return NextResponse.next()
  }

  if (origin && (origin.includes(host) || origin.includes('localhost'))) {
    return NextResponse.next()
  }

  // Allow development environment
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  // Block potential CSRF attacks in production
  return new NextResponse('CSRF protection: Invalid origin', { status: 403 })
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}