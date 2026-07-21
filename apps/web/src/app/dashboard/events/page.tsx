'use client'

import { useState } from 'react'
import { Card, CardContent, Button } from '@arko/ui'
import { Calendar, Plus, Trash2, Loader2, Clock } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

export default function EventsPage() {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  const { data: events, isLoading } = api.events.list.useQuery()
  const utils = api.useUtils()

  const create = api.events.create.useMutation({
    onSuccess: () => {
      setTitle('')
      setDate('')
      setShowForm(false)
      utils.events.list.invalidate()
    },
  })
  const del = api.events.delete.useMutation({ onSuccess: () => utils.events.list.invalidate() })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Events</h1>
          <p className="mt-1 text-sm text-gray-500">Your schedule</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (title.trim() && date)
                  create.mutate({ title: title.trim(), date: new Date(date), startTime, endTime })
              }}
              className="space-y-3"
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title..."
                autoFocus
                required
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : events?.length === 0 ? (
        <Card className="border-dashed border-gray-200">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Calendar className="mb-3 h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-400">No events yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {events?.map((ev) => (
            <Card key={ev.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="h-8 w-1 rounded-full" style={{ backgroundColor: ev.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{ev.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {ev.startTime}–{ev.endTime}
                  </p>
                </div>
                <button
                  onClick={() => confirm('Delete this event?') && del.mutate({ id: ev.id })}
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
