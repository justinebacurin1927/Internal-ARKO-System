'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRequestSignOut } from '../../../components/sign-out-provider'
import { useHeartbeat } from '../../../lib/use-heartbeat'
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
  PanelsTopLeft,
  BriefcaseBusiness,
} from 'lucide-react'
import { api } from '../../../lib/trpc/client'
import dynamic from 'next/dynamic'

const OpenPeepsAvatar = dynamic(
  () => import('../../../components/open-peeps-avatar').then((m) => ({ default: m.OpenPeepsAvatar })),
  { ssr: false, loading: () => null },
)

type NavCategory = {
  to: string
  icon: typeof LayoutDashboard
  label: string
  end?: boolean
}

const ALL_CATEGORIES: NavCategory[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/finance', icon: TrendingUp, label: 'Analytics' },
  { to: '/dashboard/events', icon: CalendarDays, label: 'Calendar' },
  { to: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/dashboard/notes', icon: FileText, label: 'Notes' },
  { to: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/dashboard/reminders', icon: Bell, label: 'Reminders' },
  { to: '/dashboard/journal', icon: Book, label: 'Journal' },
  { to: '/dashboard/ideas', icon: Lightbulb, label: 'Ideas' },
  { to: '/dashboard/resources', icon: Bookmark, label: 'Resources' },
  { to: '/dashboard/client-portal', icon: BriefcaseBusiness, label: 'Client Portal' },
  { to: '/dashboard/users', icon: Users, label: 'Users' },
]

const CLIENT_CATEGORIES: NavCategory[] = [
  { to: '/dashboard/client-portal', icon: BriefcaseBusiness, label: 'Client Portal', end: true },
  { to: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/dashboard/resources', icon: Bookmark, label: 'Shared Resources' },
]

const BOTTOM_NAV = ALL_CATEGORIES.slice(0, 5)

function isActivePath(pathname: string, item: NavCategory) {
  return item.end ? pathname === item.to : pathname.startsWith(item.to)
}

/* ─── Unread badge sources ─── */

function useUnreadCounts() {
  const { data: notifications } = api.notifications.unreadCount.useQuery(undefined, { refetchInterval: 60000 })
  const { data: messages } = api.messages.unreadCount.useQuery(undefined, {
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
  return {
    notifications: typeof notifications === 'number' ? notifications : 0,
    messages: typeof messages === 'number' ? messages : 0,
  }
}

/* ─── Nav row in the labelled sidebar ─── */

function NavRow({
  item,
  active,
  badge,
  onClick,
}: {
  item: NavCategory
  active: boolean
  badge?: number
  onClick?: () => void
}) {
  return (
    <Link
      href={item.to}
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
        active
          ? 'bg-card text-text-primary font-medium'
          : 'text-text-secondary hover:bg-card/[0.03] hover:text-text-primary'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-500" />
      )}
      <item.icon
        className={`h-[18px] w-[18px] shrink-0 ${
          active ? 'text-text-primary' : 'text-text-tertiary group-hover:text-text-secondary'
        }`}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {badge ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

/* ─── Mobile nav drawer ─── */

function MobileDrawer({
  open,
  onClose,
  categories,
  user,
  messageUnread,
  onSettings,
  onLogout,
}: {
  open: boolean
  onClose: () => void
  categories: NavCategory[]
  user: any
  messageUnread: number
  onSettings: () => void
  onLogout: () => void
}) {
  const pathname = usePathname()

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}

      <div
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-bg-sidebar shadow-xl transition-transform duration-300 ease-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 h-14">
          <span
            className="flex items-center gap-2 text-lg font-bold text-text-primary"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            <img src="/icon.png" alt="" className="h-5 w-auto" />
            ARKO
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {categories.map((item) => (
            <NavRow
              key={item.to}
              item={item}
              active={isActivePath(pathname, item)}
              badge={item.to === '/dashboard/messages' ? messageUnread : undefined}
              onClick={onClose}
            />
          ))}
        </div>

        <div className="border-t border-border-subtle p-3">
          <div className="mb-2 flex items-center gap-3 px-1">
            <OpenPeepsAvatar userId={user?.id} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">{user?.name ?? 'User'}</p>
              <p className="truncate text-[11px] text-text-tertiary">{user?.email ?? ''}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => {
                onClose()
                onSettings()
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-card/[0.04] hover:text-text-primary transition-colors cursor-pointer"
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

/* ─── Shell ─── */

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()
  useHeartbeat()
  const sessionUser = session?.user as any
  const { data: profile } = api.users.getProfile.useQuery(undefined, { enabled: status === 'authenticated' })
  const user = profile ?? sessionUser
  const isClient = sessionUser?.role === 'CLIENT'
  const [showSearch, setShowSearch] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [navSearch, setNavSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const unread = useUnreadCounts()

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus()
  }, [showSearch])

  useEffect(() => {
    setShowDrawer(false)
  }, [pathname])

  useEffect(() => {
    if (
      status === 'authenticated' &&
      isClient &&
      !CLIENT_CATEGORIES.some((item) => isActivePath(pathname, item)) &&
      pathname !== '/dashboard/settings'
    ) {
      router.replace('/dashboard/client-portal')
    }
  }, [isClient, pathname, router, status])

  const requestSignOut = useRequestSignOut()
  const handleLogout = () => requestSignOut()

  const categories = isClient
    ? CLIENT_CATEGORIES
    : ALL_CATEGORIES.filter(
        (item) =>
          item.to !== '/dashboard/client-portal' ||
          sessionUser?.role === 'ADMIN',
      )
  const filteredCategories = navSearch
    ? categories.filter((c) => c.label.toLowerCase().includes(navSearch.toLowerCase()))
    : categories
  const currentCategory = categories.find((c) => isActivePath(pathname, c))
  const bottomCategories = isClient ? CLIENT_CATEGORIES : BOTTOM_NAV
  return (
    <div className="h-dvh bg-bg-app text-text-primary">
      <MobileDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        categories={categories}
        user={user}
        messageUnread={unread.messages}
        onSettings={() => router.push('/dashboard/settings')}
        onLogout={handleLogout}
      />

      <div className="flex h-full">
        {/* ── Sidebar ── */}
        <aside className="hidden md:flex h-full w-60 shrink-0 flex-col border-r border-border-subtle bg-bg-sidebar">
          <div className="flex items-center gap-2 px-4 h-14 shrink-0">
            <PanelsTopLeft className="h-4 w-4 text-text-tertiary" />
            <span className="text-sm font-semibold text-text-primary">Your Dashboard</span>
          </div>

          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-card px-2.5 py-2">
              <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search here..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
              />
              {navSearch && (
                <button onClick={() => setNavSearch('')} className="text-text-tertiary hover:text-text-primary shrink-0 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
            {filteredCategories.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-text-tertiary">No results</p>
            ) : (
            filteredCategories.map((item) => (
              <NavRow
                key={item.to}
                item={item}
                active={isActivePath(pathname, item)}
                badge={item.to === '/dashboard/messages' ? unread.messages : undefined}
              />
            )))}
          </nav>

          {/* User / status card at the bottom */}
          <div className="border-t border-border-subtle p-3">
            <div className="flex items-center gap-3 rounded-xl bg-card p-3">
              <div className="relative shrink-0">
                <OpenPeepsAvatar userId={user?.id} avatarJson={profile?.avatar && typeof profile.avatar === 'object' && Object.keys(profile.avatar).length > 0 ? JSON.stringify(profile.avatar) : undefined} size={36} />
                {profile?.image && (
                  <img
                    src={profile.image}
                    alt=""
                    className="absolute inset-0 h-full w-full rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{user?.name ?? 'User'}</p>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-pos">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${status === 'loading' ? 'bg-text-tertiary animate-pulse' : 'bg-pos'}`}
                  />
                  {status === 'loading' ? 'Connecting…' : 'Active'}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => router.push('/dashboard/settings')}
                  title="Settings"
                  className="rounded-lg p-1.5 text-text-tertiary hover:bg-card/[0.05] hover:text-text-primary transition-colors cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="rounded-lg p-1.5 text-text-tertiary hover:bg-neg-bg hover:text-neg transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex items-center justify-between shrink-0 border-b border-border-subtle bg-bg-app/80 px-3 md:px-6 h-14 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setShowDrawer(!showDrawer)}
                className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-card/[0.05] hover:text-text-primary transition-colors cursor-pointer shrink-0"
                title="Menu"
              >
                {showDrawer ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <span className="text-sm text-text-tertiary">Home</span>
              <span className="text-text-tertiary/60">/</span>
              <span className="truncate text-sm font-medium text-text-primary">{currentCategory?.label ?? 'Dashboard'}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {showSearch ? (
                <div className="flex items-center rounded-lg border border-border-subtle bg-card px-2.5 py-1.5">
                  <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search..."
                    className="ml-1.5 w-24 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary sm:w-36"
                    onKeyDown={(e) => e.key === 'Escape' && setShowSearch(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  title="Search"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-tertiary hover:border-primary-500/40 hover:text-text-primary transition-colors cursor-pointer"
                >
                  <Search className="h-4 w-4" />
                </button>
              )}
              <Link
                href="/dashboard/messages"
                title={`${unread.messages} unread messages`}
                aria-label={`${unread.messages} unread messages`}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-tertiary hover:border-primary-500/40 hover:text-text-primary transition-colors cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                {unread.messages > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[9px] font-bold text-white">
                    {unread.messages > 99 ? '99+' : unread.messages}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/notifications"
                title="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-tertiary hover:border-primary-500/40 hover:text-text-primary transition-colors cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {unread.notifications > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neg px-1 text-[9px] font-bold text-white">
                    {unread.notifications > 99 ? '99+' : unread.notifications}
                  </span>
                )}
              </Link>
            </div>
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto px-3 md:px-6 py-4">{children}</main>

          {/* Mobile bottom nav */}
          <nav className="flex md:hidden items-center justify-around border-t border-border-subtle bg-bg-sidebar px-2 py-1.5 shrink-0 z-30">
            {bottomCategories.map((item) => {
              const active = isActivePath(pathname, item)
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-colors cursor-pointer ${
                    active ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className={`text-[9px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
