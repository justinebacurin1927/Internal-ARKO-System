import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard,
  Wallet,
  CheckSquare,
  MessageSquare,
  Bell,
  FileText,
  LogOut,
  ChevronDown,
  Loader2,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/finance', icon: Wallet, label: 'Finance' },
  { to: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/dashboard/reminders', icon: Bell, label: 'Reminders' },
  { to: '/dashboard/notes', icon: FileText, label: 'Notes' },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initial = (user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()
  const hour = new Date().getHours()

  return (
    <div className="flex h-screen overflow-hidden w-full">
      {/* Dark sidebar */}
      <aside className="w-52 flex h-screen flex-col border-r border-white/10 bg-sidebar shrink-0">
        <div className="flex h-12 items-center gap-2 border-b border-white/10 px-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-600">
            <span className="text-[10px] font-bold text-white">A</span>
          </div>
          <span className="text-sm font-semibold text-white">Arko</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97] ${
                  isActive
                    ? 'bg-primary-600/20 text-white'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
                }`
              }
            >
              {<item.icon className="h-5 w-5 shrink-0" />}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">
            Good{' '}
            {hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'}
            , {user?.name?.split(' ')[0] ?? 'User'}
          </span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors hover:bg-gray-100"
            >
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
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                <div className="border-b border-gray-100 px-3 py-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name ?? 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email ?? ''}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden bg-surface p-4 lg:p-8">
          <div className="h-full w-full animate-[fade-in_0.15s_ease-out] overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
