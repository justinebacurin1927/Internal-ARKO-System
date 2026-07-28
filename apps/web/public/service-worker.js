// Kill-switch service worker.
//
// The previous production app (Django + Vite SPA) registered a service worker
// at this path that cached its own shell offline-first. After the migration to
// Next.js that worker keeps serving stale HTML/assets and posts to routes that
// no longer exist (e.g. /api/auth/login), breaking sign-in, sign-out and user
// creation for anyone who visited the old site.
//
// Browsers re-fetch a registered worker's own script URL to check for updates.
// Serving this file at that URL replaces the stale worker with one that has no
// fetch handler (so it stops intercepting requests), wipes its caches, then
// unregisters itself and reloads open tabs onto the live app.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))

      await self.registration.unregister()

      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.navigate(client.url)
      }
    })(),
  )
})
