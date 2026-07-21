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
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' ws:",
    "frame-ancestors 'none'",
  ].join('; '),
}

export function middleware(_request: NextRequest) {
  const response = NextResponse.next()

  for (const [key, value] of Object.entries(HEADERS)) {
    response.headers.set(key, value)
  }

  return response
}

export const config = {
  matcher: [
    // Apply to all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
