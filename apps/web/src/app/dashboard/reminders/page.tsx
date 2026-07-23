'use client'

import { useState } from 'react'
import { Card, CardContent, Button } from '@arko/ui'
import {
  Bell,
  Plus,
  Check,
  Trash2,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { api } from '../../../lib/trpc/client'

export default function RemindersPage() {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')

  const { data: reminders, isLoading, error } = api.reminders.list.useQuery()
  const utils = api.useUtils()

  const createReminder = api.reminders.create.useMutation({
    onSuccess: () => {
      setTitle('')
      setNote('')
      setDueDate('')
      setShowForm(false)
      utils.reminders.list.invalidate()
    },
  })

  const toggleDone = api.reminders.toggleDone.useMutation({
    onMutate: async ({ id, isDone }) => {
      await utils.reminders.list.cancel()
      const prev = utils.reminders.list.getData()
      utils.reminders.list.setData(undefined, (old) =>
        old?.map((r) => (r.id === id ? { ...r, isDone } : r))
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      utils.reminders.list.setData(undefined, ctx?.prev)
    },
    onSettled: () => utils.reminders.list.invalidate(),
  })

  const deleteReminder = api.reminders.delete.useMutation({
    onSuccess: () => utils.reminders.list.invalidate(),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !dueDate) return
    createReminder.mutate({
      title: title.trim(),
      note: note.trim() || undefined,
      dueAt: new Date(dueDate).toISOString(),
    })
  }

  // Group reminders
  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const tomorrowEnd = new Date(todayEnd.getTime() + 86400000)

  const overdue = (reminders ?? []).filter((r) => !r.isDone && new Date(r.dueAt) < now)
  const today = (reminders ?? []).filter(
    (r) => !r.isDone && new Date(r.dueAt) >= now && new Date(r.dueAt) <= todayEnd,
  )
  const upcoming = (reminders ?? []).filter(
    (r) => !r.isDone && new Date(r.dueAt) > todayEnd,
  )
  const done = (reminders ?? []).filter((r) => r.isDone)

  function formatDate(date: Date) {
    const d = new Date(date)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function GroupSection({
    title,
    items,
    emptyMsg,
    color,
  }: {
    title: string
    items: any[]
    emptyMsg: string
    color: string
  }) {
    if (items.length === 0) return null
    return (
      <div className="space-y-2">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>
          {title} ({items.length})
        </h3>
        {items.map((r) => (
          <Card key={r.id} className={`transition-all duration-150 ${r.isDone ? 'opacity-50' : ''}`}>
            <CardContent className="flex items-start gap-4 p-4">
              <button
                onClick={() => toggleDone.mutate({ id: r.id, isDone: !r.isDone })}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 ${
                  r.isDone
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-border-subtle hover:border-primary-400'
                }`}
              >
                {r.isDone && <Check className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${r.isDone ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                  {r.title}
                </p>
                {r.note && (
                  <p className="mt-1 text-xs text-text-tertiary">{r.note}</p>
                )}
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-tertiary">
                  <Clock className="h-3 w-3" />
                  {formatDate(new Date(r.dueAt))} {new Date(r.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => deleteReminder.mutate({ id: r.id })}
                className="shrink-0 rounded-lg p-1.5 text-text-tertiary opacity-0 transition-all duration-150 hover:bg-neg-bg hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Reminders</h1>
          <p className="text-sm text-text-tertiary mt-1">Never miss a thing</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'New reminder'}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you need to remember?"
                  required
                  className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Due date</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <Button type="submit" disabled={createReminder.isPending}>
                {createReminder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create reminder'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-medium text-red-800">Failed to load reminders</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
          ))}
        </div>
      ) : reminders?.length === 0 ? (
        <Card className="border-dashed border-border-subtle">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Bell className="h-10 w-10 text-text-muted mb-3" />
            <p className="text-sm text-text-tertiary">No reminders yet</p>
            <p className="text-xs text-text-muted mt-1">Click &quot;New reminder&quot; to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <GroupSection title="Overdue" items={overdue} emptyMsg="" color="text-red-500" />
          <GroupSection title="Today" items={today} emptyMsg="" color="text-primary-600" />
          <GroupSection title="Upcoming" items={upcoming} emptyMsg="" color="text-text-tertiary" />
          {done.length > 0 && (
            <>
              <hr className="border-border-subtle" />
              <GroupSection title="Completed" items={done} emptyMsg="" color="text-text-tertiary" />
            </>
          )}
        </div>
      )}
    </div>
  )
}
