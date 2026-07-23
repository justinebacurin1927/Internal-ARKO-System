'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@arko/ui'
import { Plus, Trash2, Loader2, Clock, AlertCircle, ChevronLeft, ChevronRight, CalendarDays, Pencil, Flag } from 'lucide-react'
import { api } from '../../../lib/trpc/client'
import { SprintDialog } from './sprint-dialog'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = first.getDay()
  const daysInMonth = last.getDate()
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7
  return { startPad, daysInMonth, totalCells }
}

export default function EventsPage() {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [error, setError] = useState('')
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false)
  const [editSprintId, setEditSprintId] = useState<string | undefined>()
  const [viewDate, setViewDate] = useState(() => new Date())

  const today = useMemo(() => new Date(), [])
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const { startPad, daysInMonth, totalCells } = getMonthGrid(year, month)

  const { data: events, isLoading } = api.events.list.useQuery()
  const { data: sprints } = api.events.listSprints.useQuery()
  const utils = api.useUtils()

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof events> = {}
    events?.forEach((ev) => {
      const key = new Date(ev.date).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(ev)
    })
    return map
  }, [events])

  const deleteSprintMut = api.events.deleteSprint.useMutation({
    onSuccess: () => utils.events.listSprints.invalidate(),
  })

  const create = api.events.create.useMutation({
    onSuccess: () => {
      setError('')
      setTitle('')
      setDate('')
      setShowForm(false)
      utils.events.list.invalidate()
    },
    onError: (e) => setError(e.message),
  })
  const del = api.events.delete.useMutation({
    onSuccess: () => utils.events.list.invalidate(),
    onError: (e) => setError(e.message),
  })

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }

  const isToday = (d: number) => {
    const t = today
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === d
  }

  const hasEvents = (d: number) => {
    const key = new Date(year, month, d).toDateString()
    return eventsByDate[key] && eventsByDate[key].length > 0
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Calendar</h1>
          <p className="mt-1 text-sm text-text-tertiary">Your schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setViewDate(new Date())}>Today</Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> Event
          </Button>
        </div>
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
                className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-neg-bg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 text-neg shrink-0" />
                  <p className="text-[11px] text-neg">{error}</p>
                </div>
              )}
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="rounded-lg p-1.5 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold text-text-primary">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="rounded-lg p-1.5 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-medium text-text-tertiary py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - startPad + 1
              const inMonth = dayNum >= 1 && dayNum <= daysInMonth
              return (
                <div
                  key={i}
                  className={`relative min-h-[56px] border border-border-subtle p-1 text-xs transition-colors ${
                    !inMonth ? 'bg-black/[0.02]' : ''
                  } ${isToday(dayNum) ? 'bg-primary-500/10' : ''}`}
                >
                  {inMonth && (
                    <>
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday(dayNum) ? 'bg-primary-500 text-white font-bold' : 'text-text-primary'
                      }`}>
                        {dayNum}
                      </span>
                      {hasEvents(dayNum) && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {eventsByDate[new Date(year, month, dayNum).toDateString()]?.slice(0, 3).map((_, ei) => (
                            <span key={ei} className="h-1 w-1 rounded-full bg-primary-500" />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <Card className="border-dashed border-border-subtle">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CalendarDays className="mb-3 h-8 w-8 text-text-muted" />
            <p className="text-sm text-text-tertiary">No events yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Upcoming Events</h3>
          {events?.map((ev) => (
            <Card key={ev.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="h-8 w-1 rounded-full" style={{ backgroundColor: ev.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{ev.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-text-tertiary">
                    <Clock className="h-3 w-3" />
                    {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {ev.startTime}–{ev.endTime}
                  </p>
                </div>
                <button
                  onClick={() => confirm('Delete this event?') && del.mutate({ id: ev.id })}
                  className="shrink-0 rounded-lg p-1 text-text-muted hover:bg-neg-bg hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="my-8 border-t border-border-subtle" />

      {/* Sprints section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">Sprints</h2>
          <p className="text-xs text-text-tertiary mt-0.5">Plan and track your development sprints</p>
        </div>
        <Button size="sm" onClick={() => { setEditSprintId(undefined); setSprintDialogOpen(true) }}>
          <Plus className="h-4 w-4" /> New Sprint
        </Button>
      </div>

      {!sprints || sprints.length === 0 ? (
        <Card className="border-dashed border-border-subtle">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Flag className="mb-3 h-8 w-8 text-text-muted" />
            <p className="text-sm text-text-tertiary">No sprints yet</p>
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
                        <p className="text-sm font-semibold text-text-primary truncate">{s.name}</p>
                      </div>
                      {s.goal && <p className="mt-0.5 text-xs text-text-secondary">{s.goal}</p>}
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button
                      onClick={() => { setEditSprintId(s.id); setSprintDialogOpen(true) }}
                      className="rounded p-1.5 text-text-tertiary hover:bg-card hover:text-text-secondary transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => confirm('Delete this sprint?') && deleteSprintMut.mutate({ id: s.id })}
                      className="rounded p-1.5 text-text-tertiary hover:bg-card hover:text-red-500 transition-colors"
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
                      <p className="truncate text-sm font-medium text-text-primary">{s.name}</p>
                      {s.isActive && (
                        <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-semibold text-green-700">Active</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-tertiary">
                      {new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {s.goal && <span> · {s.goal}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditSprintId(s.id); setSprintDialogOpen(true) }}
                    className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-card/[0.04] hover:text-text-secondary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => confirm('Delete this sprint?') && deleteSprintMut.mutate({ id: s.id })}
                    className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-neg-bg hover:text-red-500 transition-colors"
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
