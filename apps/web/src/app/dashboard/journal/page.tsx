'use client'

import { useState } from 'react'
import { Card, CardContent, Button } from '@arko/ui'
import { BookOpen, Plus, Trash2, Pencil, Loader2 } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

export default function JournalPage() {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')

  const { data: entries, isLoading } = api.journal.list.useQuery()
  const utils = api.useUtils()

  const create = api.journal.create.useMutation({
    onSuccess: () => {
      setTitle('')
      setContent('')
      setMood('')
      setEditId(undefined)
      setShowForm(false)
      utils.journal.list.invalidate()
    },
  })
  const update = api.journal.update.useMutation({
    onSuccess: () => {
      setTitle('')
      setContent('')
      setMood('')
      setEditId(undefined)
      setShowForm(false)
      utils.journal.list.invalidate()
    },
  })
  const del = api.journal.delete.useMutation({ onSuccess: () => utils.journal.list.invalidate() })

  const isSaving = create.isPending || update.isPending

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Journal</h1>
          <p className="mt-1 text-sm text-text-tertiary">Reflect on your days</p>
        </div>
        <Button size="sm" onClick={() => { setEditId(undefined); setShowForm(!showForm) }}>
          {showForm && !editId ? 'Cancel' : <><Plus className="h-4 w-4" /> New</>}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="mb-3 text-xs font-medium text-text-tertiary">{editId ? 'Edit Entry' : 'New Entry'}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!title.trim()) return
                if (editId) {
                  update.mutate({ id: editId, title: title.trim(), content: content || undefined, mood: mood || undefined })
                } else {
                  create.mutate({ title: title.trim(), content, mood: mood || undefined })
                }
              }}
              className="space-y-3"
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Entry title..."
                autoFocus
                required
                className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <input
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="Mood (optional)"
                className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your thoughts..."
                rows={5}
                className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : editId ? 'Save Changes' : 'Save'}
                </Button>
                {editId && (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setEditId(undefined); setTitle(''); setContent(''); setMood(''); setShowForm(false) }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : entries?.length === 0 ? (
        <Card className="border-dashed border-border-subtle">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <BookOpen className="mb-3 h-8 w-8 text-text-tertiary" />
            <p className="text-sm text-text-tertiary">No journal entries yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries?.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-text-primary">{e.title}</p>
                    {e.mood && (
                      <span className="rounded-full bg-card px-2 py-0.5 text-[10px] text-text-tertiary">
                        {e.mood}
                      </span>
                    )}
                  </div>
                  {e.content && <p className="mt-1 line-clamp-2 text-xs text-text-tertiary">{e.content}</p>}
                  <p className="mt-1 text-[10px] text-text-tertiary">
                    {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => {
                      setEditId(e.id)
                      setTitle(e.title)
                      setMood(e.mood ?? '')
                      setContent(e.content ?? '')
                      setShowForm(true)
                    }}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-card/[0.04] hover:text-text-secondary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => confirm('Delete this entry?') && del.mutate({ id: e.id })}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-neg-bg hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
