'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NavItem } from '@arko/ui'
import {
  LayoutDashboard,
  Wallet,
  Workflow,
  CheckSquare,
  Settings,
  MessageSquare,
  Bell,
  FileText,
  GitCommit,
  Users,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: '/dashboard/finance', label: 'Finance', icon: <Wallet className="h-5 w-5" /> },
  { href: '/dashboard/workflows', label: 'Workflows', icon: <Workflow className="h-5 w-5" /> },
  { href: '/dashboard/tasks', label: 'Tasks', icon: <CheckSquare className="h-5 w-5" /> },
  { href: '/dashboard/updates', label: 'Updates', icon: <GitCommit className="h-5 w-5" /> },
  { href: '/dashboard/users', label: 'Users', icon: <Users className="h-5 w-5" /> },
  { href: '/dashboard/messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
  { href: '/dashboard/reminders', label: 'Reminders', icon: <Bell className="h-5 w-5" /> },
  { href: '/dashboard/notes', label: 'Notes', icon: <FileText className="h-5 w-5" /> },
  { href: '/dashboard/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()

  // Prefetch all nav routes so they compile in the background
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href)
    })
  }, [router])

  return (
    <div className="space-y-1">
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={pathname === item.href || pathname.startsWith(item.href + '/')}
        />
      ))}
    </div>
  )
}
