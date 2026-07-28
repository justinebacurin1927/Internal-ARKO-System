'use client'

import { useEffect } from 'react'
import { api } from './trpc/client'

// Marks the current user active on mount, every 60s while a tab is open, and
// when the tab regains focus — so presence ("Active" / "Active 3h ago") is real.
export function useHeartbeat() {
  const heartbeat = api.users.heartbeat.useMutation()

  useEffect(() => {
    const beat = () => heartbeat.mutate()
    beat()
    const interval = setInterval(beat, 60_000)
    window.addEventListener('focus', beat)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', beat)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
