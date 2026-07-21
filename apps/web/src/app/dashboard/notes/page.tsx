'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, Button } from '@arko/ui'
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { api } from '../../../lib/trpc/client'

export default function NotesPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const { data: notes, isLoading, error } = api.notes.list.useQuery()
  const utils = api.useUtils()

  const createNote = api.notes.create.useMutation({
    onSuccess: (note) => {
      setTitle('')
      setContent('')
      setShowForm(false)
      utils.notes.list.invalidate()
      router.push(`/dashboard/notes/${note.id}`)
    },
  })

  const deleteNote = api.notes.delete.useMutation({
    onSuccess: () => utils.notes.list.invalidate(),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createNote.mutate({ title: title.trim(), content })
  }

  function formatDate(date: Date) {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left — note list */}
      <div className="flex w-72 shrink-0 flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notes</h1>
            <p className="text-sm text-gray-500 mt-1">Write down your ideas</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>

        {showForm && (
          <Card className="mb-3">
            <CardContent className="p-4">
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title..."
                  autoFocus
                  required
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing..."
                  rows={4}
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={createNote.isPending}>
                    {createNote.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Create'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm font-medium text-red-800">Failed to load notes</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : notes?.length === 0 ? (
          <Card className="border-dashed border-gray-200">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <FileText className="h-8 w-8 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No notes yet</p>
              <p className="text-xs text-gray-300 mt-1">Click "New" to create your first note</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 space-y-1 overflow-y-auto">
            {notes?.map((note) => (
              <button
                key={note.id}
                onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                className="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all duration-150 hover:bg-gray-50"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{note.title}</p>
                  <p className="text-xs text-gray-400">{formatDate(note.updatedAt)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this note?')) deleteNote.mutate({ id: note.id })
                  }}
                  className="shrink-0 rounded-lg p-1 text-gray-300 opacity-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right — welcome / empty state */}
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">Select a note or create a new one</p>
        </div>
      </div>
    </div>
  )
}
