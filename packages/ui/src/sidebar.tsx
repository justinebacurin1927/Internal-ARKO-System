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
        'flex h-screen flex-col border-r border-gray-200 bg-white',
        collapsed ? 'w-16' : 'w-64',
        'transition-all duration-200',
        className,
      )}
      {...props}
    >
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        {collapsed ? (
          <span className="text-lg font-bold text-primary-600">A</span>
        ) : (
          <span className="text-lg font-bold text-gray-900">
            <span className="text-primary-600">Arko</span>
          </span>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {children}
      </nav>
    </aside>
  ),
)
Sidebar.displayName = 'Sidebar'

export { Sidebar }
