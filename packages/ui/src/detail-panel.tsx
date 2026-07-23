'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from './lib/utils'

export interface DetailPanelProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

/**
 * In-page right sidebar for showing the details of a selected record.
 * Meant to sit as the last child of a `flex flex-col lg:flex-row` row: it
 * stacks below the content on mobile and docks to the right on large screens,
 * sticking under the app header while the list scrolls. It is NOT an overlay.
 */
export function DetailPanel({
  open,
  onClose,
  title,
  eyebrow,
  actions,
  className,
  children,
}: DetailPanelProps) {
  if (!open) return null
  return (
    <aside
      className={cn(
        'flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-card shadow-card',
        'lg:sticky lg:top-0 lg:w-[360px] lg:max-h-[calc(100dvh-5.5rem)]',
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              {eyebrow}
            </p>
          )}
          {title && (
            <h2 className="truncate text-base font-semibold text-text-primary">{title}</h2>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="cursor-pointer rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  )
}
