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
  /** Unread/notification count. Renders a red badge when > 0. */
  badge?: number
}

const NavItem = React.forwardRef<HTMLAnchorElement, NavItemProps>(
  ({ href, icon, label, active, collapsed, badge, className, ...props }, ref) => {
    const showBadge = typeof badge === 'number' && badge > 0
    return (
      <Link
        ref={ref}
        href={href}
        className={cn(
          'relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97]',
          active
            ? 'bg-primary-600/20 text-white'
            : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active',
          collapsed && 'justify-center px-2',
          className,
        )}
        {...props}
      >
        {icon && (
          <span className={cn('relative h-5 w-5 shrink-0', active && 'text-primary-400')}>
            {icon}
            {showBadge && collapsed && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-sidebar" />
            )}
          </span>
        )}
        {!collapsed && <span>{label}</span>}
        {!collapsed && showBadge && (
          <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  },
)
NavItem.displayName = 'NavItem'

export { NavItem }
