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
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97]',
        active
          ? 'bg-primary-600/20 text-white'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active',
        collapsed && 'justify-center px-2',
        className,
      )}
      {...props}
    >
      {icon && (
        <span className={cn('h-5 w-5 shrink-0', active && 'text-primary-400')}>{icon}</span>
      )}
      {!collapsed && <span>{label}</span>}
    </Link>
  ),
)
NavItem.displayName = 'NavItem'

export { NavItem }
