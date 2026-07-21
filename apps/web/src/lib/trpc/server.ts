import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { headers } from 'next/headers'
import superjson from 'superjson'
import type { AppRouter } from '../../server/api/root'

export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trpc`,
      transformer: superjson,
      headers: async () => {
        const heads = new Headers(await headers())
        heads.set('x-trpc-source', 'server')
        return Object.fromEntries(heads.entries())
      },
    }),
  ],
})
