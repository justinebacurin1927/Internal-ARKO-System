'use client'

import * as ToastPrimitive from '@radix-ui/react-toast'
import { useSyncExternalStore } from 'react'
import { CheckCircle2, X } from 'lucide-react'

type Toast = { id: number; message: string }

// Module-level store so `toast()` can be called from anywhere (including right
// before a navigation) while <Toaster /> lives in the root providers and
// persists across route changes.
let toasts: Toast[] = []
const listeners = new Set<() => void>()
let nextId = 1

function emit() {
  for (const listener of listeners) listener()
}

export function toast(message: string) {
  const id = nextId++
  toasts = [...toasts, { id, message }]
  emit()
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot() {
  return toasts
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={3000}>
      {items.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id)
          }}
          className="flex items-center gap-2.5 rounded-xl border border-border-subtle bg-card px-3.5 py-3 shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right-4 data-[state=closed]:animate-out data-[state=closed]:fade-out"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-finance-600" />
          <ToastPrimitive.Title className="flex-1 text-[12px] font-medium text-text-primary">
            {t.message}
          </ToastPrimitive.Title>
          <ToastPrimitive.Close
            aria-label="Dismiss"
            className="rounded-lg p-1 text-text-tertiary transition-colors hover:bg-card hover:text-text-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex w-[360px] max-w-[100vw] flex-col gap-2 p-4 outline-none" />
    </ToastPrimitive.Provider>
  )
}
