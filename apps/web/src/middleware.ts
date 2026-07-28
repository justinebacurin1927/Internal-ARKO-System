import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Security headers applied to every response.
 * CSP is intentionally permissive for tRPC (needs 'unsafe-eval' and 'unsafe-inline').
 * Stricter CSP can be applied once tRPC's worker bundle is separated.
 */
const HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' ws:",
    "frame-ancestors 'none'",
  ].join('; '),
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  for (const [key, value] of Object.entries(HEADERS)) {
    response.headers.set(key, value)
  }

  // Prevent the browser from caching authenticated pages (HTTP cache + bfcache).
  // Without this, hitting Back after signing out restores the cached dashboard
  // instead of forcing a fresh request (which redirects to login).
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
  }

  return response
}

export const config = {
  matcher: [
    // Apply to all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
