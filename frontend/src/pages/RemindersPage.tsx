import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent } from '../components/Card'
import { Button } from '../components/Button'
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle, Bell } from 'lucide-react'

export default function RemindersPage() {
  const queryClient = useQueryClient()
  const { data: reminders, isLoading, error } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => api.getReminders(),
  })

  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [dueAt, setDueAt] = useState('')

  const createReminder = useMutation({
    mutationFn: () =>
      api.createReminder({
        title: title.trim(),
        note: note.trim() || undefined,
        due_at: dueAt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setShowNew(false)
      setTitle('')
      setNote('')
      setDueAt('')
    },
  })

  const toggleReminder = useMutation({
    mutationFn: (id: string) => api.toggleReminder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  })

  const deleteReminder = useMutation({
    mutationFn: (id: string) => api.deleteReminder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  })

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4" />
        Failed to load reminders
      </div>
    )
  }

  if (isLoading) return <div className="text-sm text-gray-400">Loading reminders...</div>

  const overdue = reminders?.filter((r: any) => !r.is_done && r.due_at && new Date(r.due_at) < new Date()) || []
  const upcoming = reminders?.filter((r: any) => !r.is_done && (!r.due_at || new Date(r.due_at) >= new Date())) || []
  const done = reminders?.filter((r: any) => r.is_done) || []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reminders</h1>
          <p className="text-sm text-gray-500 mt-1">Never miss a thing</p>
        </div>
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" />
          {showNew ? 'Cancel' : 'New Reminder'}
        </Button>
      </div>

      {showNew && (
        <Card className="overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What do you need to remember?"
                autoFocus
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional details..."
                rows={2}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Due date</label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => createReminder.mutate()}
                disabled={!title.trim() || createReminder.isPending}
              >
                {createReminder.isPending ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="ghost" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {reminders?.length === 0 && (
        <div className="text-center py-12">
          <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <Bell className="h-5 w-5 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">No reminders yet</p>
        </div>
      )}

      <div className="space-y-6">
        {overdue.length > 0 && (
          <Section title="Overdue" count={overdue.length}>
            {overdue.map((r: any) => (
              <ReminderItem key={r.id} reminder={r} onToggle={toggleReminder.mutate} onDelete={deleteReminder.mutate} />
            ))}
          </Section>
        )}

        {upcoming.length > 0 && (
          <Section title="Upcoming" count={upcoming.length}>
            {upcoming.map((r: any) => (
              <ReminderItem key={r.id} reminder={r} onToggle={toggleReminder.mutate} onDelete={deleteReminder.mutate} />
            ))}
          </Section>
        )}

        {done.length > 0 && (
          <Section title="Completed" count={done.length}>
            {done.map((r: any) => (
              <ReminderItem key={r.id} reminder={r} onToggle={toggleReminder.mutate} onDelete={deleteReminder.mutate} />
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title} ({count})</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function ReminderItem({
  reminder,
  onToggle,
  onDelete,
}: {
  reminder: any
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      <button onClick={() => onToggle(reminder.id)} className="shrink-0">
        {reminder.is_done ? (
          <CheckCircle2 className="h-5 w-5 text-primary-500" />
        ) : (
          <Circle className="h-5 w-5 text-gray-300 hover:text-gray-400" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${reminder.is_done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {reminder.title}
        </p>
        {reminder.due_at && (
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(reminder.due_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
      <button onClick={() => onDelete(reminder.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
