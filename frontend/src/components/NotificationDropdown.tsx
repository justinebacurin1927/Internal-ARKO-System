import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { AtSign, UserPlus, MessageSquare, PlusCircle, CheckCheck } from 'lucide-react'

interface NotificationDropdownProps {
  onClose: () => void
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const typeIcons: Record<string, any> = {
  mention: AtSign,
  assignment: UserPlus,
  comment: MessageSquare,
  task_created: PlusCircle,
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ref = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  })

  const notifications = data?.results || []

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleClick = async (n: any) => {
    // Mark as read
    if (!n.is_read) {
      try { await api.markNotificationRead(n.id) } catch {}
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    }
    // Navigate
    if (n.task) {
      navigate(`/dashboard/tasks`)
    }
    onClose()
  }

  const handleMarkAllRead = async () => {
    try { await api.markAllNotificationsRead() } catch {}
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['unread-count'] })
  }

  const hasUnread = notifications.some((n: any) => !n.is_read)

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border-subtle bg-white shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <h3 className="text-xs font-semibold text-text-primary">Notifications</h3>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-[10px] text-accent-500 hover:text-accent-600 transition-colors cursor-pointer"
          >
            <CheckCheck className="h-3 w-3" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="py-6 text-center text-xs text-text-tertiary">No notifications</p>
        ) : (
          notifications.slice(0, 20).map((n: any) => {
            const Icon = typeIcons[n.notification_type] || MessageSquare
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent-50/40 cursor-pointer ${
                  n.is_read ? '' : 'bg-accent-50/20'
                }`}
              >
                <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  n.notification_type === 'mention' ? 'bg-warn-bg text-warn' :
                  n.notification_type === 'assignment' ? 'bg-pos-bg text-pos' :
                  'bg-accent-50 text-accent-500'
                }`}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-primary leading-snug">{n.message}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border-subtle px-3 py-1.5">
        <button
          onClick={() => { navigate('/dashboard/notifications'); onClose() }}
          className="w-full text-center text-[10px] text-accent-500 hover:text-accent-600 transition-colors cursor-pointer"
        >
          Show all notifications
        </button>
      </div>
    </div>
  )
}
