import { SessionProvider } from 'next-auth/react'
import { TRPCProvider } from '../lib/trpc/TRPCProvider'
import { Toaster } from '../components/toaster'
import { SignOutProvider } from '../components/sign-out-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <SignOutProvider>{children}</SignOutProvider>
        <Toaster />
      </TRPCProvider>
    </SessionProvider>
  )
}
