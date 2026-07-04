import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import {
  Bell, CheckCheck, Trash2, Loader2,
} from 'lucide-react'

const TYPE_ICONS: Record<string, string> = {
  TASK_ASSIGNED: '📋',
  COMMENT: '💬',
  MENTION: '@',
  TASK_DONE: '✅',
  MESSAGE: '✉️',
}

export default function NotificationBell() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.unreadNotificationCount(),
    refetchInterval: 30000,
  })

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    enabled: open,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const deleteNotif = useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unread = countData?.count ?? 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-black/[0.06] text-text-tertiary hover:ring-accent-400 hover:text-accent-500 transition-all cursor-pointer"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-neg px-1 text-[8px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full z-40 ml-3 bottom-0 w-80 rounded-xl border border-border-subtle bg-white shadow-lg p-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold text-text-primary">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="inline-flex items-center gap-1 text-[10px] text-accent-600 hover:text-accent-500 font-medium transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto space-y-0.5">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`group flex gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                    n.read ? '' : 'bg-accent-50/60'
                  } hover:bg-accent-50`}
                >
                  <span className="mt-0.5 text-base leading-none shrink-0">
                    {TYPE_ICONS[n.notif_type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] ${n.read ? 'text-text-secondary' : 'font-semibold text-text-primary'}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-[10px] text-text-tertiary mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-[9px] text-text-tertiary mt-0.5">
                      {new Date(n.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!n.read && (
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="flex h-5 w-5 items-center justify-center rounded text-text-tertiary hover:text-accent-600 hover:bg-accent-100 transition-all cursor-pointer"
                        title="Mark read"
                      >
                        <CheckCheck className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif.mutate(n.id)}
                      className="flex h-5 w-5 items-center justify-center rounded text-text-tertiary hover:text-neg hover:bg-neg-bg transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <Bell className="mx-auto h-5 w-5 text-text-tertiary mb-1" />
                <p className="text-[11px] text-text-tertiary">No notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
