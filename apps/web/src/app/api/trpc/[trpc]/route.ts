import { NextResponse } from 'next/server'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '../../../../server/api/root'
import { createTRPCContext } from '../../../../lib/trpc/context'
import { apiLimiter, requestKey } from '../../../../lib/rate-limit'

const handler = async (req: Request) => {
  // Rate limit: 100 requests per minute per IP
  const ipKey = requestKey(req)
  const rateCheck = apiLimiter.check(ipKey)
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
        },
      },
    )
  }

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  })
}

export { handler as GET, handler as POST }
