'use client'

import { Card, CardContent, Button } from '@arko/ui'
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

export default function NotificationsPage() {
  const { data: items, isLoading } = api.notifications.list.useQuery(undefined, {
    refetchInterval: 15000,
  })
  const utils = api.useUtils()
  const invalidate = () => {
    utils.notifications.list.invalidate()
    utils.notifications.unreadCount.invalidate()
  }

  const markRead = api.notifications.markRead.useMutation({ onSuccess: invalidate })
  const markAllRead = api.notifications.markAllRead.useMutation({ onSuccess: invalidate })
  const del = api.notifications.delete.useMutation({ onSuccess: invalidate })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">Stay up to date</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => markAllRead.mutate()}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : items?.length === 0 ? (
        <Card className="border-dashed border-gray-200">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Bell className="mb-3 h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-400">You&apos;re all caught up</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items?.map((n) => (
            <Card key={n.id} className={n.read ? '' : 'border-primary-200 bg-primary-50/40'}>
              <CardContent className="flex items-start gap-3 p-4">
                <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.read ? 'text-gray-300' : 'text-primary-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  {n.message && <p className="mt-1 text-xs text-gray-500">{n.message}</p>}
                </div>
                {!n.read && (
                  <button
                    title="Mark read"
                    onClick={() => markRead.mutate({ id: n.id })}
                    className="shrink-0 rounded-lg p-1 text-gray-300 hover:bg-primary-50 hover:text-primary-600"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => del.mutate({ id: n.id })}
                  className="shrink-0 rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
