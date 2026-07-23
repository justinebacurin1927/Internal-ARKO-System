'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@arko/ui'
import { Calendar, Plus, Trash2, Loader2, Clock, Target, Pencil, Flag } from 'lucide-react'
import { api } from '../../../lib/trpc/client'
import { SprintDialog } from './sprint-dialog'

export default function EventsPage() {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false)
  const [editSprintId, setEditSprintId] = useState<string | undefined>()

  const { data: events, isLoading } = api.events.list.useQuery()
  const { data: sprints } = api.events.listSprints.useQuery()
  const utils = api.useUtils()

  const deleteSprintMut = api.events.deleteSprint.useMutation({
    onSuccess: () => utils.events.listSprints.invalidate(),
  })

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

      {/* Divider */}
      <div className="my-8 border-t border-gray-100" />

      {/* Sprints section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Sprints</h2>
          <p className="text-xs text-gray-500 mt-0.5">Plan and track your development sprints</p>
        </div>
        <Button size="sm" onClick={() => { setEditSprintId(undefined); setSprintDialogOpen(true) }}>
          <Plus className="h-4 w-4" /> New Sprint
        </Button>
      </div>

      {!sprints || sprints.length === 0 ? (
        <Card className="border-dashed border-gray-200">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Flag className="mb-3 h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-400">No sprints yet</p>
            <Button size="sm" className="mt-3" onClick={() => setSprintDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Create Sprint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active sprint highlight */}
          {sprints.filter((s) => s.isActive).slice(0, 1).map((s) => (
            <Card key={s.id} className="mb-4 border-primary-200 bg-primary-50/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">Active</span>
                        <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                      </div>
                      {s.goal && <p className="mt-0.5 text-xs text-gray-600">{s.goal}</p>}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button
                      onClick={() => { setEditSprintId(s.id); setSprintDialogOpen(true) }}
                      className="rounded p-1.5 text-gray-400 hover:bg-card hover:text-gray-700 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => confirm('Delete this sprint?') && deleteSprintMut.mutate({ id: s.id })}
                      className="rounded p-1.5 text-gray-400 hover:bg-card hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* All sprints list */}
          <div className="space-y-2">
            {sprints.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">{s.name}</p>
                      {s.isActive && (
                        <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-semibold text-green-700">Active</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {s.goal && <span> · {s.goal}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditSprintId(s.id); setSprintDialogOpen(true) }}
                    className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => confirm('Delete this sprint?') && deleteSprintMut.mutate({ id: s.id })}
                    className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <SprintDialog open={sprintDialogOpen} onOpenChange={setSprintDialogOpen} editId={editSprintId} />
    </div>
  )
}
