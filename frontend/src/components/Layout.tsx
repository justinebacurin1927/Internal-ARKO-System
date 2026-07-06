import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { useState, useRef, useEffect } from 'react'
import NotificationBell from './NotificationBell'
import {
  LayoutDashboard,
  TrendingUp,
  CheckSquare,
  CalendarDays,
  MessageSquare,
  Bell,
  FileText,
  Search,
  LogOut,
  Settings,
  Users,
  Book,
  Lightbulb,
  Bookmark,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import NotificationBell from './NotificationBell'

const today = new Date()
const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

const ALL_CATEGORIES = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/finance', icon: TrendingUp, label: 'Analytics', end: false },
  { to: '/dashboard/calendar', icon: CalendarDays, label: 'Calendar', end: false },
  { to: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/dashboard/notes', icon: FileText, label: 'Notes' },
  { to: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/dashboard/reminders', icon: Bell, label: 'Reminders' },
  { to: '/dashboard/journal', icon: Book, label: 'Journal', end: false },
  { to: '/dashboard/ideas', icon: Lightbulb, label: 'Ideas', end: false },
  { to: '/dashboard/resources', icon: Bookmark, label: 'Resources', end: false },
  { to: '/dashboard/users', icon: Users, label: 'Users', end: false, admin: true },
]

/* ─── Mobile bottom-nav items (5 most used) ─── */
const BOTTOM_NAV = ALL_CATEGORIES.slice(0, 5)

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
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 cursor-pointer ${
        active
          ? 'ring-2 ring-accent-500 text-accent-500 shadow-[0_2px_8px_rgba(45,106,79,0.25)]'
          : 'ring-1 ring-black/[0.06] text-text-tertiary hover:ring-accent-400 hover:text-accent-500 hover:shadow-[0_2px_8px_rgba(45,106,79,0.15)]'
      }`}
    >
      {children}
    </button>
  )
}

/* ─── Mobile nav drawer ─── */

function MobileDrawer({
  open,
  onClose,
  categories,
  user,
  initial,
  onSettings,
  onLogout,
}: {
  open: boolean
  onClose: () => void
  categories: typeof ALL_CATEGORIES
  user: any
  initial: string
  onSettings: () => void
  onLogout: () => void
}) {
  const location = useLocation()

  const isActive = (item: typeof ALL_CATEGORIES[0]) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-xl transition-transform duration-300 ease-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border-subtle">
          <span className="font-display-smooth text-lg text-accent-600 font-bold flex items-center gap-2">
            <img src="/icon.png" alt="" className="h-5 w-auto" />
            ARKO
          </span>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-2 px-2" style={{ height: 'calc(100% - 3.5rem - 3.5rem)' }}>
          {categories.map((item) => {
            const active = isActive(item)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                  active
                    ? 'bg-accent-50 text-accent-700 font-semibold'
                    : 'text-text-secondary hover:bg-black/[0.03] hover:text-text-primary'
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-accent-500' : 'text-text-tertiary'}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 text-accent-400" />}
              </NavLink>
            )
          })}
        </div>

        {/* User footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border-subtle p-3 bg-white">
          <div className="flex items-center gap-3 px-1 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-50 text-accent-600 text-xs font-bold">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{user?.name ?? 'User'}</p>
              <p className="text-[11px] text-text-tertiary truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => { onClose(); onSettings() }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-accent-50 hover:text-accent-600 transition-colors cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </button>
            <button
              onClick={onLogout}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-neg hover:bg-neg-bg transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMenu, setShowMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [connected, setConnected] = useState<boolean | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Health check polling
  useEffect(() => {
    const check = () => api.health().then(() => setConnected(true)).catch(() => setConnected(false))
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

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

  useEffect(() => {
    // Close drawer on route change
    setShowDrawer(false)
  }, [location.pathname])

  const handleLogout = () => { logout(); navigate('/login') }
  const initial = (user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()

  const categories = ALL_CATEGORIES.filter(
    (c) => !(c as any).admin || user?.role === 'ADMIN',
  )

  const currentCategory = categories.find(
    (c) => (c.end ? location.pathname === c.to : location.pathname.startsWith(c.to)),
  )

  return (
    <div className="h-dvh bg-bg-app">
      {/* ── Mobile nav drawer ── */}
      <MobileDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        categories={categories}
        user={user}
        initial={initial}
        onSettings={() => navigate('/dashboard/settings')}
        onLogout={handleLogout}
      />

      <div className="flex h-full">

        {/* ── Left navigation rail (desktop only) ── */}
        <nav className="hidden md:flex sticky top-0 z-40 h-full w-[72px] shrink-0 flex-col items-center gap-2 pt-3">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 shadow-sm">
            <span className="text-sm font-bold text-white">A</span>
          </div>

          {categories.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'ring-2 ring-accent-500 text-accent-500 shadow-[0_2px_8px_rgba(45,106,79,0.25)]'
                    : 'ring-1 ring-black/[0.06] text-text-tertiary hover:ring-accent-400 hover:text-accent-500 hover:shadow-[0_2px_8px_rgba(45,106,79,0.15)]'
                }`
              }
              title={item.label}
            >
              <item.icon className="h-4 w-4" />
            </NavLink>
          ))}

          <div className="flex-1" />

          <div className="relative mb-3" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-black/[0.06] text-text-tertiary text-xs font-bold hover:ring-accent-300 hover:text-accent-500 transition-all cursor-pointer"
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
                  onClick={() => { setShowMenu(false); navigate('/dashboard/settings') }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-accent-50/60 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
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

          {/* Mobile header + desktop header merged */}
          <div className="sticky top-0 z-30 flex items-center justify-between shrink-0
            mx-2 md:mx-6 mt-2 md:mt-3 mb-2 md:mb-3
            rounded-full ring-1 ring-black/[0.08] px-3 md:px-4 h-10 bg-white/80 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              {/* Hamburger (mobile only) */}
              <button
                onClick={() => setShowDrawer(!showDrawer)}
                className="flex md:hidden h-8 w-8 items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-black/[0.03] transition-colors cursor-pointer shrink-0"
                title="Menu"
              >
                {showDrawer ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              <span className="text-xs font-semibold text-text-primary truncate">
                {currentCategory?.label ?? 'Dashboard'}
              </span>
              <span className="hidden sm:block text-[11px] text-text-tertiary font-medium whitespace-nowrap">
                {dateStr}
              </span>
              <span className={`hidden md:flex items-center gap-1.5 text-[10px] font-medium ${
                connected === null ? 'text-text-tertiary' :
                connected ? 'text-pos' : 'text-neg'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  connected === null ? 'bg-text-tertiary animate-pulse' :
                  connected ? 'bg-pos' : 'bg-neg'
                }`} />
                {connected === null ? 'Connecting…' : connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
              <NotificationBell />
              {showSearch ? (
                <div className="flex items-center rounded-full bg-bg-app ring-1 ring-black/[0.06] px-2.5 md:px-3 py-1.5">
                  <Search className="h-4 w-4 text-text-tertiary shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search..."
                    className="ml-1.5 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary w-20 sm:w-28 lg:w-36"
                    onBlur={() => setShowSearch(false)}
                    onKeyDown={(e) => e.key === 'Escape' && setShowSearch(false)}
                  />
                </div>
              ) : (
                <CircleBtn title="Search" onClick={() => setShowSearch(true)}>
                  <Search className="h-4 w-4" />
                </CircleBtn>
              )}
            </div>
          </div>

          {/* Content area — reduced padding on mobile */}
          <main className="flex-1 min-h-0 px-2 md:px-6 pb-4 md:pb-4 overflow-hidden">
            <Outlet />
          </main>

          {/* ── Mobile bottom navigation bar ── */}
          <nav className="flex md:hidden items-center justify-around px-2 py-1.5 border-t border-border-subtle bg-white/95 backdrop-blur-md shrink-0 z-30">
            {BOTTOM_NAV.map((item) => {
              const isActive = item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors cursor-pointer min-w-0 ${
                    isActive
                      ? 'text-accent-600'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-accent-500' : ''}`} />
                  <span className={`text-[9px] font-medium leading-tight ${isActive ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
