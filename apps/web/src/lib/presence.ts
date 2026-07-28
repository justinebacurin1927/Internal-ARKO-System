// Turns a lastActiveAt timestamp into a presence badge.
// Considered "online" (Active) if seen within the last 5 minutes.

export function formatPresence(
  lastActiveAt: Date | string | null | undefined,
): { online: boolean; label: string } {
  if (!lastActiveAt) return { online: false, label: 'Offline' }

  const diffMs = Date.now() - new Date(lastActiveAt).getTime()
  const min = Math.floor(diffMs / 60_000)

  if (min < 5) return { online: true, label: 'Active' }
  if (min < 60) return { online: false, label: `Active ${min}m ago` }

  const hr = Math.floor(min / 60)
  if (hr < 24) return { online: false, label: `Active ${hr}h ago` }

  const d = Math.floor(hr / 24)
  if (d < 7) return { online: false, label: `Active ${d}d ago` }

  const w = Math.floor(d / 7)
  return { online: false, label: `Active ${w}w ago` }
}
