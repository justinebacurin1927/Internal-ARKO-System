'use client'

import { usePathname } from 'next/navigation'
import { NavItem } from '@arko/ui'
import {
  LayoutDashboard,
  Wallet,
  Workflow,
  CheckSquare,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: '/finance', label: 'Finance', icon: <Wallet className="h-5 w-5" /> },
  { href: '/workflows', label: 'Workflows', icon: <Workflow className="h-5 w-5" /> },
  { href: '/tasks', label: 'Tasks', icon: <CheckSquare className="h-5 w-5" /> },
  { href: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <div className="space-y-1">
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={pathname === item.href}
        />
      ))}
    </div>
  )
}
