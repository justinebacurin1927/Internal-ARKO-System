'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink, httpLink, splitLink } from '@trpc/client'
import { useState } from 'react'
import superjson from 'superjson'
import { api } from './client'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // don't refetch for 30s — avoids churn on nav
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        splitLink({
          // GitHub API fetches are slow + external — don't block the batch
          condition: (op) => op.path.startsWith('github.'),
          true: httpLink({ url: '/api/trpc', transformer: superjson }),
          false: httpBatchLink({ url: '/api/trpc', transformer: superjson }),
        }),
      ],
    }),
  )

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  )
}
