'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from '../components/toaster'

// Signs out without next-auth's own redirect, then client-navigates to the
// login page so the confirmation toast (rendered by the root <Toaster />)
// stays visible across the transition.
export function useSignOut() {
  const router = useRouter()

  return async () => {
    await signOut({ redirect: false })
    toast('Signed out successfully')
    router.push('/auth/login')
  }
}
