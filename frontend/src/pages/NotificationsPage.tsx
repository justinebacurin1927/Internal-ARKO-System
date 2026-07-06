import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent } from '../components/Card'
import { useNavigate } from 'react-router-dom'
import {
  AtSign, UserPlus, MessageSquare, PlusCircle,
  CheckCheck, Bell, Loader2, ChevronLeft
} from 'lucide-react'

const typeIcons: Record<string, any> = {
  mention: AtSign,
  assignment: UserPlus,
  comment: MessageSquare,
  task_created: PlusCircle,
}

const typeColors: Record<string, string> = {
  mention: 'bg-warn-bg text-warn',
  assignment: 'bg-pos-bg text-pos',
  comment: 'bg-accent-50 text-accent-500',
  task_created: 'bg-accent-50 text-accent-500',
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

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-page', page],
    queryFn: () => api.getNotifications(page),
  })

  const notifications = data?.results || []

  const handleClick = async (n: any) => {
    if (!n.is_read) {
      try { await api.markNotificationRead(n.id) } catch {}
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    }
    if (n.task) navigate('/dashboard/tasks')
  }

  const handleMarkAllRead = async () => {
    try { await api.markAllNotificationsRead() } catch {}
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-page'] })
  }

  const hasUnread = notifications.some((n: any) => !n.is_read)

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-bold text-text-primary tracking-tight">Notifications</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Stay up to date with mentions and assignments</p>
        </div>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-accent-500 hover:bg-accent-50 transition-colors cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <Card className="flex-1">
        <CardContent className="p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50">
                <Bell className="h-5 w-5 text-accent-500" />
              </div>
              <p className="mt-3 text-sm font-medium text-text-primary">No notifications</p>
              <p className="text-xs text-text-tertiary mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {notifications.map((n: any) => {
                const Icon = typeIcons[n.notification_type] || MessageSquare
                const color = typeColors[n.notification_type] || 'bg-accent-50 text-accent-500'
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent-50/40 cursor-pointer ${
                      n.is_read ? '' : 'bg-accent-50/15'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary leading-snug">{n.message}</p>
                      <p className="text-[11px] text-text-tertiary mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="flex items-center justify-center gap-2 pt-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-text-secondary hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" /> Previous
              </button>
              <span className="text-xs text-text-tertiary">{page} of {Math.ceil(data.total / 20)}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.has_next}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-text-secondary hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
