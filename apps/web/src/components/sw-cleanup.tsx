'use client'

import { useEffect } from 'react'

// One-time cleanup: the previous (Django + Vite) app left a service worker
// registered that keeps serving a stale cached shell after deploys. The new
// app registers no worker, so unconditionally unregister any that exist and
// drop their caches. Runs once per load; cheap and safe since we never want a
// service worker here.
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistrations().then((regs) => {
      if (regs.length === 0) return
      Promise.all(regs.map((r) => r.unregister()))
        .then(() =>
          typeof caches !== 'undefined'
            ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            : undefined,
        )
        .then(() => {
          // A worker was controlling this page; reload once to get fresh assets.
          if (navigator.serviceWorker.controller) window.location.reload()
        })
        .catch(() => {})
    })
  }, [])

  return null
}
