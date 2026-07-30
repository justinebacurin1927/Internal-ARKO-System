import { NextResponse } from 'next/server'
import { registerLimiter, requestKey } from '../../../../lib/rate-limit'

export async function POST(req: Request) {
  // Rate limit: 5 registrations per minute per IP
  const ipKey = requestKey(req)
  const rateCheck = registerLimiter.check(ipKey)
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
        },
      },
    )
  }

  return NextResponse.json(
    {
      error: 'Public registration is disabled. Ask an administrator to create your account.',
    },
    { status: 403 },
  )
}
