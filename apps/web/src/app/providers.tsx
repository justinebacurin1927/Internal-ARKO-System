import { SessionProvider } from 'next-auth/react'
import { TRPCProvider } from '../lib/trpc/TRPCProvider'
import { Toaster } from '../components/toaster'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        {children}
        <Toaster />
      </TRPCProvider>
    </SessionProvider>
  )
}
