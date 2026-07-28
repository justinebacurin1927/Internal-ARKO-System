'use client'

import { useSession } from 'next-auth/react'
import {
  LogOut,
  User,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useSignOut } from '../../../lib/use-sign-out'

export function DashboardHeader() {
  const { data: session, status } = useSession()
  const signOut = useSignOut()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const user = session?.user
  const initial = (user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-card px-4 lg:px-6">
      {/* Left side — greeting */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-text-primary">
          {status === 'loading' ? (
            <span className="text-text-tertiary">Loading...</span>
          ) : (
            <>Good{' '}
              {new Date().getHours() < 12
                ? 'Morning'
                : new Date().getHours() < 18
                  ? 'Afternoon'
                  : 'Evening'}
              , {user?.name?.split(' ')[0] ?? 'User'}
            </>
          )}
        </span>
      </div>

      {/* Right side — user menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors hover:bg-card"
        >
          {status === 'loading' ? (
            <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
          ) : (
            <>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-500 text-[10px] font-bold text-white shrink-0">
                {initial}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-text-primary leading-tight truncate max-w-[120px]">
                  {user?.name ?? 'User'}
                </p>
                <p className="text-[10px] text-text-tertiary leading-tight truncate max-w-[120px]">
                  {user?.email ?? ''}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
            </>
          )}
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-border-subtle bg-card p-1.5 shadow-xl">
            <div className="border-b border-border-subtle px-3 py-2 mb-1">
              <p className="text-sm font-medium text-text-primary truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-text-tertiary truncate">{user?.email ?? ''}</p>
              {user?.role && (
                <span className="mt-1 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                  {user.role}
                </span>
              )}
            </div>

            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-neg-bg"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
