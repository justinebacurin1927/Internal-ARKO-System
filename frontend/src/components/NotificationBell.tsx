import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Bell } from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  // Poll for unread count every 30s
  const { data } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.getUnreadNotificationCount(),
    refetchInterval: 30000,
  })

  const count = data?.count ?? 0

  // Refresh notification list when bell is clicked
  const handleClick = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    setOpen(!open)
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-black/[0.06] text-text-tertiary hover:ring-accent-400 hover:text-accent-500 transition-all cursor-pointer"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-neg px-1 py-0.5 text-[9px] font-bold text-white leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && <NotificationDropdown onClose={() => setOpen(false)} />}
    </div>
  )
}
