'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from './lib/utils'

interface NavItemProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string
  icon?: React.ReactNode
  label: string
  active?: boolean
  collapsed?: boolean
}

const NavItem = React.forwardRef<HTMLAnchorElement, NavItemProps>(
  ({ href, icon, label, active, collapsed, className, ...props }, ref) => (
    <Link
      ref={ref}
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        collapsed && 'justify-center px-2',
        className,
      )}
      {...props}
    >
      {icon && <span className="h-5 w-5 shrink-0">{icon}</span>}
      {!collapsed && <span>{label}</span>}
    </Link>
  ),
)
NavItem.displayName = 'NavItem'

export { NavItem }
