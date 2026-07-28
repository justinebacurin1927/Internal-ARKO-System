'use client'

import { createContext, useContext, useState } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'
import { toast } from './toaster'

const SignOutContext = createContext<() => void>(() => {})

export function useRequestSignOut() {
  return useContext(SignOutContext)
}

// Provides a confirm-then-sign-out flow. Any descendant calls useRequestSignOut()
// to open the dialog; confirming clears the session (without next-auth's hard
// redirect), shows a toast, and client-navigates to the login page.
export function SignOutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    await signOut({ redirect: false })
    toast('Signed out successfully')
    // Close the dialog before navigating — this provider lives at the root and
    // survives the route change, so it must reset its own state or the spinner
    // stays stuck on top of the login page.
    setOpen(false)
    setBusy(false)
    router.replace('/auth/login')
    router.refresh()
  }

  return (
    <SignOutContext.Provider value={() => setOpen(true)}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-border-subtle bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
                <LogOut className="h-4 w-4 text-red-600" />
              </div>
              <h2 className="text-sm font-bold text-text-primary">Sign out?</h2>
            </div>
            <p className="mb-4 text-[12px] text-text-secondary">
              You&apos;ll need to sign in again to access your dashboard.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 rounded-xl border border-border-subtle px-3 py-2.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-card disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirm}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 px-3 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </SignOutContext.Provider>
  )
}
