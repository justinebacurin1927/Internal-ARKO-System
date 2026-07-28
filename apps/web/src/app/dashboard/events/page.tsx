'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, Button, DetailPanel } from '@arko/ui'
import {
  Plus,
  Trash2,
  Loader2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Pencil,
  Flag,
  CalendarClock,
  ChevronDown,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { api } from '../../../lib/trpc/client'
import { SprintDialog } from './sprint-dialog'

const OpenPeepsAvatar = dynamic(() =>
  import('../../../components/open-peeps-avatar').then((m) => ({ default: m.OpenPeepsAvatar })),
  { ssr: false },
)

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// Month grid is Monday-first, matching the reference layout
const MONTH_HEADS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m ?? 0).padStart(2, '0')} ${ampm}`
}

function fmtDateTime(d: Date) {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function EventsPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [view, setView] = useState<'month' | 'day'>('month')
  const [viewMenu, setViewMenu] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [error, setError] = useState('')
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false)
  const [editSprintId, setEditSprintId] = useState<string | undefined>()
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: events, isLoading } = api.events.list.useQuery()
  const { data: sprints } = api.events.listSprints.useQuery()
  const utils = api.useUtils()

  const deleteSprintMut = api.events.deleteSprint.useMutation({
    onSuccess: () => utils.events.listSprints.invalidate(),
  })
  const create = api.events.create.useMutation({
    onSuccess: () => {
      setError('')
      setTitle('')
      setDescription('')
      setDate('')
      setShowForm(false)
      utils.events.list.invalidate()
    },
    onError: (e) => setError(e.message),
  })
  const del = api.events.delete.useMutation({
    onSuccess: () => {
      setSelectedId(null)
      utils.events.list.invalidate()
    },
    onError: (e) => setError(e.message),
  })

  // 7-day strip centred on the current week (Sun–Sat) of viewDate — day view
  const week = useMemo(() => {
    const start = new Date(viewDate)
    start.setDate(viewDate.getDate() - viewDate.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [viewDate])

  // 6-week (42-cell) grid starting on the Monday on/before the 1st — month view
  const monthGrid = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7 // Mon-first
    const start = new Date(first)
    start.setDate(first.getDate() - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [viewDate])

  const eventsByDay = useMemo(() => {
    const map: Record<string, typeof events> = {}
    events?.forEach((ev) => {
      const k = new Date(ev.date).toDateString()
      ;(map[k] ??= []).push(ev)
    })
    Object.values(map).forEach((list) => list?.sort((a, b) => a.startTime.localeCompare(b.startTime)))
    return map
  }, [events])

  const dayEvents = useMemo(
    () => (eventsByDay[viewDate.toDateString()] ?? []) as NonNullable<typeof events>,
    [eventsByDay, viewDate],
  )

  const selected = events?.find((e) => e.id === selectedId) ?? null
  const today = new Date()

  const shiftDay = (n: number) =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n))
  const shiftMonth = (n: number) =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + n, 1))

  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)

  const openAddForDay = (d: Date) => {
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Calendar</h1>
          <p className="mt-1 text-sm text-text-tertiary">Your whole schedule in one place</p>
        </div>
      </div>

      {/* ── Calendar toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-border-subtle bg-card">
            <span className="text-[9px] font-bold uppercase leading-none text-primary-400">
              {today.toLocaleDateString('en-US', { month: 'short' })}
            </span>
            <span className="text-sm font-bold leading-tight text-text-primary">{today.getDate()}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight text-text-primary">
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-xs text-text-tertiary">
              {view === 'month'
                ? `${monthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${monthEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => (view === 'month' ? shiftMonth(-1) : shiftDay(-1))}
              className="rounded-lg border border-border-subtle p-1.5 text-text-tertiary transition-colors hover:text-text-primary cursor-pointer"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <Button size="sm" variant="outline" onClick={() => setViewDate(new Date())}>
              Today
            </Button>
            <button
              onClick={() => (view === 'month' ? shiftMonth(1) : shiftDay(1))}
              className="rounded-lg border border-border-subtle p-1.5 text-text-tertiary transition-colors hover:text-text-primary cursor-pointer"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* View switcher */}
          <div className="relative">
            <button
              onClick={() => setViewMenu((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-card px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary cursor-pointer"
            >
              {view === 'month' ? 'Month view' : 'Day view'}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {viewMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setViewMenu(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-border-subtle bg-card shadow-lg">
                  {(['month', 'day'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setView(v)
                        setViewMenu(false)
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm capitalize transition-colors hover:bg-white/[0.04] cursor-pointer ${
                        view === v ? 'font-medium text-text-primary' : 'text-text-secondary'
                      }`}
                    >
                      {v} view
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" /> Add event
          </Button>
        </div>
      </div>

      {/* ── Add-event form (compact, never full-width) ── */}
      {showForm && (
        <Card className="max-w-md">
          <CardContent className="p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (title.trim() && date)
                  create.mutate({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    date: new Date(date),
                    startTime,
                    endTime,
                  })
              }}
              className="space-y-3"
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title..."
                autoFocus
                required
                className="block w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)…"
                rows={2}
                className="block w-full resize-none rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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

      {/* ── Calendar body + detail panel ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Card className="min-w-0 flex-1">
          <CardContent className="p-3 md:p-4">
            {view === 'month' ? (
              /* ── Month grid ── */
              <div className="overflow-hidden rounded-xl border border-border-subtle">
                <div className="grid grid-cols-7 border-b border-border-subtle bg-white/[0.02]">
                  {MONTH_HEADS.map((d) => (
                    <div
                      key={d}
                      className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-text-tertiary"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthGrid.map((d, i) => {
                    const inMonth = d.getMonth() === viewDate.getMonth()
                    const isToday = sameDay(d, today)
                    const cellEvents = eventsByDay[d.toDateString()] ?? []
                    const shown = cellEvents.slice(0, 3)
                    const extra = cellEvents.length - shown.length
                    return (
                      <div
                        key={d.toISOString()}
                        onClick={() => inMonth && openAddForDay(d)}
                        className={`min-h-[104px] cursor-pointer border-border-subtle p-1.5 transition-colors hover:bg-white/[0.02] ${
                          i % 7 !== 6 ? 'border-r' : ''
                        } ${i < 35 ? 'border-b' : ''} ${inMonth ? '' : 'bg-white/[0.015]'}`}
                      >
                        <div className="mb-1 flex items-center justify-center">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                              isToday
                                ? 'bg-primary-500 text-white'
                                : inMonth
                                  ? 'text-text-secondary'
                                  : 'text-text-tertiary/50'
                            }`}
                          >
                            {d.getDate()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {shown.map((ev) => (
                            <button
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedId(ev.id)
                              }}
                              className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors ${
                                ev.id === selectedId ? 'bg-primary-500/15' : 'hover:bg-white/[0.06]'
                              }`}
                            >
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: ev.color }}
                              />
                              <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-text-primary">
                                {ev.title}
                              </span>
                              <span className="hidden shrink-0 text-[10px] text-text-tertiary sm:inline">
                                {fmtTime(ev.startTime)}
                              </span>
                            </button>
                          ))}
                          {extra > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setViewDate(new Date(d))
                                setView('day')
                              }}
                              className="px-1.5 text-[10px] font-medium text-primary-400 hover:underline"
                            >
                              +{extra} more
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* ── Day timeline ── */
              <>
                <div className="mb-3 flex items-center justify-center">
                  <h3 className="text-base font-semibold text-text-primary">
                    {viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                </div>

                {/* Week strip */}
                <div className="mb-4 grid grid-cols-7 gap-1">
                  {week.map((d) => {
                    const active = sameDay(d, viewDate)
                    const isToday = sameDay(d, today)
                    const count = (eventsByDay[d.toDateString()] ?? []).length
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => setViewDate(new Date(d))}
                        className={`flex flex-col items-center gap-1 rounded-xl border py-2 transition-colors cursor-pointer ${
                          active
                            ? 'border-primary-500/50 bg-primary-500/15 text-text-primary'
                            : 'border-border-subtle text-text-tertiary hover:bg-white/[0.03] hover:text-text-secondary'
                        }`}
                      >
                        <span className="text-[10px] font-medium uppercase">{WEEKDAY[d.getDay()]}</span>
                        <span className={`text-sm font-semibold ${isToday && !active ? 'text-primary-400' : ''}`}>
                          {d.getDate()}
                        </span>
                        <span
                          className={`h-1 w-1 rounded-full ${count > 0 ? (active ? 'bg-primary-400' : 'bg-primary-500') : 'bg-transparent'}`}
                        />
                      </button>
                    )
                  })}
                </div>

                {/* Events for the day */}
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
                    ))}
                  </div>
                ) : dayEvents.length === 0 ? (
                  <div className="flex flex-col items-center py-14 text-center">
                    <CalendarDays className="mb-3 h-8 w-8 text-text-tertiary" />
                    <p className="text-sm text-text-tertiary">Nothing scheduled for this day</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayEvents.map((ev) => {
                      const isSel = ev.id === selectedId
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedId(ev.id)}
                          className={`flex w-full items-stretch gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                            isSel
                              ? 'border-primary-500/50 bg-primary-500/10'
                              : 'border-border-subtle bg-white/[0.02] hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="w-16 shrink-0 text-right">
                            <p className="text-xs font-semibold text-text-primary">{fmtTime(ev.startTime)}</p>
                            <p className="text-[10px] text-text-tertiary">{fmtTime(ev.endTime)}</p>
                          </div>
                          <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: ev.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text-primary">{ev.title}</p>
                            {ev.description && (
                              <p className="mt-0.5 truncate text-xs text-text-tertiary">{ev.description}</p>
                            )}
                          </div>
                          <OpenPeepsAvatar userId={user?.id} size={28} />
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Right — in-page detail panel */}
        <DetailPanel
          open={!!selected}
          onClose={() => setSelectedId(null)}
          eyebrow="Event"
          title={selected?.title}
        >
          {selected && (
            <>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{ backgroundColor: `${selected.color}22`, color: selected.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: selected.color }} />
                Event
              </span>

              <p className="mt-3 flex items-center gap-1.5 text-xs text-text-tertiary">
                <Clock className="h-3.5 w-3.5" />
                {new Date(selected.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}
                {fmtTime(selected.startTime)} – {fmtTime(selected.endTime)}
              </p>

              <p className="mt-3 text-sm text-text-secondary">
                {selected.description || 'No description for this event.'}
              </p>

              {/* Activity summary */}
              <div className="mt-4 border-t border-border-subtle pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Activity</p>
                <div className="flex items-center gap-2.5">
                  <OpenPeepsAvatar userId={user?.id} size={32} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{user?.name ?? 'You'}</p>
                    <p className="text-[11px] text-text-tertiary">Owner</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-text-tertiary">
                    <Plus className="h-3.5 w-3.5 text-primary-400" />
                    <span className="text-text-secondary">{user?.name ?? 'You'}</span> created this
                    <span className="ml-auto">{fmtDateTime(new Date(selected.createdAt))}</span>
                  </div>
                  {new Date(selected.updatedAt).getTime() !== new Date(selected.createdAt).getTime() && (
                    <div className="flex items-center gap-2 text-text-tertiary">
                      <CalendarClock className="h-3.5 w-3.5 text-text-tertiary" />
                      last updated
                      <span className="ml-auto">{fmtDateTime(new Date(selected.updatedAt))}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => confirm('Delete this event?') && del.mutate({ id: selected.id })}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-subtle py-2 text-xs font-medium text-neg hover:bg-neg-bg transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete event
              </button>
            </>
          )}
        </DetailPanel>
      </div>

      {/* Divider */}
      <div className="border-t border-border-subtle" />

      {/* ── Sprints section ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">Sprints</h2>
          <p className="mt-0.5 text-xs text-text-tertiary">Plan and track your development sprints</p>
        </div>
        <Button size="sm" onClick={() => { setEditSprintId(undefined); setSprintDialogOpen(true) }}>
          <Plus className="h-4 w-4" /> New Sprint
        </Button>
      </div>

      {!sprints || sprints.length === 0 ? (
        <Card className="border-dashed border-border-subtle">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Flag className="mb-3 h-8 w-8 text-text-tertiary" />
            <p className="text-sm text-text-tertiary">No sprints yet</p>
            <Button size="sm" className="mt-3" onClick={() => setSprintDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Create Sprint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sprints.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-text-primary">{s.name}</p>
                    {s.isActive && (
                      <span className="rounded-full bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary-400">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                    {new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {s.goal && <span> · {s.goal}</span>}
                  </p>
                </div>
                <button
                  onClick={() => { setEditSprintId(s.id); setSprintDialogOpen(true) }}
                  className="shrink-0 rounded-lg p-1.5 text-text-tertiary hover:bg-white/[0.05] hover:text-text-secondary transition-colors cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => confirm('Delete this sprint?') && deleteSprintMut.mutate({ id: s.id })}
                  className="shrink-0 rounded-lg p-1.5 text-text-tertiary hover:bg-neg-bg hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SprintDialog open={sprintDialogOpen} onOpenChange={setSprintDialogOpen} editId={editSprintId} />
    </div>
  )
}
