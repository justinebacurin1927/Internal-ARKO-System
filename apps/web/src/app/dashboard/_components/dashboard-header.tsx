'use client'

import { useSession, signOut } from 'next-auth/react'
import {
  LogOut,
  User,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function DashboardHeader() {
  const { data: session, status } = useSession()
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
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Left side — greeting */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-800">
          {status === 'loading' ? (
            <span className="text-gray-400">Loading...</span>
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
          className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors hover:bg-gray-100"
        >
          {status === 'loading' ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-500 text-[10px] font-bold text-white shrink-0">
                {initial}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-gray-900 leading-tight truncate max-w-[120px]">
                  {user?.name ?? 'User'}
                </p>
                <p className="text-[10px] text-gray-400 leading-tight truncate max-w-[120px]">
                  {user?.email ?? ''}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </>
          )}
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
            <div className="border-b border-gray-100 px-3 py-2 mb-1">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email ?? ''}</p>
              {user?.role && (
                <span className="mt-1 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                  {user.role}
                </span>
              )}
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
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
