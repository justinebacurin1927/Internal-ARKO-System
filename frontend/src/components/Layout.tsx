import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard,
  TrendingUp,
  CheckSquare,
  MessageSquare,
  Bell,
  FileText,
  Search,
  LogOut,
} from 'lucide-react'

const today = new Date()
const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

const categories = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/finance', icon: TrendingUp, label: 'Analytics', end: false },
  { to: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/dashboard/notes', icon: FileText, label: 'Notes' },
  { to: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/dashboard/reminders', icon: Bell, label: 'Reminders' },
]

/* ─── Floating circle — ring-based, no bg fill ─── */

function CircleBtn({ children, active, title, onClick }: {
  children: React.ReactNode
  active?: boolean
  title?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 cursor-pointer ${
        active
          ? 'ring-2 ring-accent-500 text-accent-500 shadow-[0_2px_8px_rgba(45,106,79,0.25)]'
          : 'ring-1 ring-black/[0.06] text-text-tertiary hover:ring-accent-400 hover:text-accent-500 hover:shadow-[0_2px_8px_rgba(45,106,79,0.15)]'
      }`}
    >
      {children}
    </button>
  )
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMenu, setShowMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus()
  }, [showSearch])

  const handleLogout = () => { logout(); navigate('/login') }
  const initial = (user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()

  const currentCategory = categories.find(
    (c) => (c.end ? location.pathname === c.to : location.pathname.startsWith(c.to)),
  )

  return (
    /* ── h-dvh = no scroll on the whole app ── */
    <div className="h-dvh bg-bg-app">
      <div className="flex h-full">

        {/* ── Left navigation rail ── */}
        <nav className="sticky top-0 z-40 flex h-full w-[72px] shrink-0 flex-col items-center gap-3 pt-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 shadow-sm">
            <span className="text-sm font-bold text-white">A</span>
          </div>

          {categories.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'ring-2 ring-accent-500 text-accent-500 shadow-[0_2px_8px_rgba(45,106,79,0.25)]'
                    : 'ring-1 ring-black/[0.06] text-text-tertiary hover:ring-accent-400 hover:text-accent-500 hover:shadow-[0_2px_8px_rgba(45,106,79,0.15)]'
                }`
              }
              title={item.label}
            >
              <item.icon className="h-[18px] w-[18px]" />
            </NavLink>
          ))}

          <div className="flex-1" />

          <div className="relative mb-4" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-black/[0.06] text-text-tertiary text-xs font-bold hover:ring-accent-300 hover:text-accent-500 transition-all cursor-pointer"
              title="User menu"
            >
              {initial}
            </button>
            {showMenu && (
              <div className="absolute left-full z-30 ml-3 bottom-0 w-56 rounded-xl border border-border-subtle bg-white p-1.5 shadow-lg">
                <div className="border-b border-border-subtle px-3 py-2 mb-1">
                  <p className="text-sm font-semibold text-text-primary truncate">{user?.name ?? 'User'}</p>
                  <p className="text-xs text-text-tertiary truncate">{user?.email ?? ''}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neg transition-colors hover:bg-neg-bg cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* ── Main area ── */}
        <div className="flex flex-1 flex-col min-w-0">

          {/* Floating header */}
          <div className="sticky top-0 z-30 mx-6 mt-4 mb-4 flex items-center justify-between rounded-full ring-1 ring-black/[0.08] px-5 h-12 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-text-primary">
                {currentCategory?.label ?? 'Dashboard'}
              </span>
              <span className="hidden sm:block text-xs text-text-tertiary font-medium">
                {dateStr}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {showSearch ? (
                <div className="flex items-center rounded-full bg-bg-app ring-1 ring-black/[0.06] px-3 py-1.5">
                  <Search className="h-4 w-4 text-text-tertiary shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search..."
                    className="ml-2 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary w-32 lg:w-44"
                    onBlur={() => setShowSearch(false)}
                    onKeyDown={(e) => e.key === 'Escape' && setShowSearch(false)}
                  />
                </div>
              ) : (
                <CircleBtn title="Search" onClick={() => setShowSearch(true)}>
                  <Search className="h-[18px] w-[18px]" />
                </CircleBtn>
              )}
            </div>
          </div>

          {/* Content fills remaining space — no scroll */}
          <main className="flex-1 min-h-0 px-6 pb-4 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
