'use client'

import * as React from 'react'
import { cn } from './lib/utils'

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, collapsed = false, children, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(
        'flex h-screen flex-col border-r border-white/10 bg-sidebar',
        collapsed ? 'w-16' : 'w-64',
        'transition-all duration-200 shrink-0',
        className,
      )}
      {...props}
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600">
          <span className="text-xs font-bold text-white">A</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-white">Arko</span>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-3">{children}</nav>
    </aside>
  ),
)
Sidebar.displayName = 'Sidebar'

export { Sidebar }
