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
        collapsed ? 'w-14' : 'w-52',
        'transition-all duration-200 shrink-0',
        className,
      )}
      {...props}
    >
      <div className="flex h-12 items-center gap-2 border-b border-white/10 px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-600">
          <span className="text-[10px] font-bold text-white">A</span>
        </div>
        {!collapsed && (
          <span className="text-[13px] font-semibold text-white">Arko</span>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 p-2">{children}</nav>
    </aside>
  ),
)
Sidebar.displayName = 'Sidebar'

export { Sidebar }
