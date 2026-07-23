'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@arko/ui'
import { Plus, Trash2, FileText, AlertCircle, Search } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

export default function NotesPage() {
  const { data: notes, isLoading, error } = api.notes.list.useQuery()
  const utils = api.useUtils()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [noteSearch, setNoteSearch] = useState('')

  const { data: selectedNote } = api.notes.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  )

  // Populate the editor when a note loads
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title)
      setContent(selectedNote.content)
    }
  }, [selectedNote])

  const createNote = api.notes.create.useMutation({
    onSuccess: (note) => {
      utils.notes.list.invalidate()
      setSelectedId(note.id)
      setTitle(note.title)
      setContent(note.content)
    },
  })

  const updateNote = api.notes.update.useMutation({
    onSuccess: () => utils.notes.list.invalidate(),
  })

  const deleteNote = api.notes.delete.useMutation({
    onSuccess: (_data, vars) => {
      utils.notes.list.invalidate()
      if (selectedId === vars.id) {
        setSelectedId(null)
        setTitle('')
        setContent('')
      }
      setConfirmDelete(false)
    },
  })

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-neg/30 bg-neg-bg p-4 text-sm text-neg">
        <AlertCircle className="h-4 w-4" />
        Failed to load notes
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="flex items-start justify-between shrink-0">
          <div>
            <div className="h-7 w-24 animate-pulse rounded bg-black/[0.05]" />
            <div className="h-4 w-40 animate-pulse rounded bg-black/[0.05] mt-1" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-lg bg-black/[0.05]" />
        </div>
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="w-64 shrink-0 rounded-2xl bg-black/[0.02] p-3 space-y-2 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-black/[0.04]" />
            ))}
          </div>
          <div className="flex-1 rounded-2xl bg-black/[0.02] p-5 space-y-3">
            <div className="h-6 w-1/3 animate-pulse rounded bg-black/[0.04]" />
            <div className="h-4 w-full animate-pulse rounded bg-black/[0.04]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-black/[0.04]" />
          </div>
        </div>
      </div>
    )
  }

  const filtered = (notes ?? []).filter(
    (n) => !noteSearch || n.title?.toLowerCase().includes(noteSearch.toLowerCase()),
  )

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Notes</h1>
          <p className="text-sm text-text-tertiary mt-1">Write and manage your notes</p>
        </div>
        <Button onClick={() => createNote.mutate({ title: 'Untitled', content: '' })}>
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      {notes?.length === 0 && (
        <div className="text-center py-12 shrink-0">
          <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-black/[0.04] flex items-center justify-center">
            <FileText className="h-5 w-5 text-text-tertiary" />
          </div>
          <p className="text-sm text-text-tertiary">No notes yet</p>
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Notes list */}
        <Card className={`w-64 shrink-0 overflow-hidden flex-col ${selectedId ? 'hidden md:flex' : 'flex w-full md:w-64'}`}>
          <CardHeader className="p-3 border-b border-border-subtle space-y-2">
            <CardTitle className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">All Notes</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
              <input
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                placeholder="Filter notes..."
                className="block w-full rounded-md border border-border-subtle pl-7 pr-2 py-1.5 text-xs focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/20"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {filtered.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  selectedId === note.id ? 'bg-accent-50' : 'hover:bg-black/[0.02]'
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{note.title || 'Untitled'}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className={`flex-1 overflow-hidden flex-col ${!selectedId ? 'hidden md:flex' : 'flex w-full md:flex'}`}>
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-text-tertiary">
              <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-black/[0.04] flex items-center justify-center">
                  <FileText className="h-5 w-5 text-text-tertiary" />
                </div>
                <p className="text-sm">Select or create a note</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-3 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedId(null)}
                  className="flex md:hidden h-8 w-8 items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-black/[0.03] transition-colors cursor-pointer shrink-0 mr-1"
                  title="Back to notes"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                  className="text-sm font-bold text-text-primary bg-transparent border-none focus:outline-none w-full"
                />
                <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(true)} className="text-text-tertiary hover:text-neg shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing..."
                className="flex-1 w-full resize-none border-none bg-transparent text-sm text-text-secondary focus:outline-none leading-relaxed"
              />
              <div className="pt-3 border-t border-border-subtle mt-3 flex items-center justify-between">
                {confirmDelete ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-secondary">Delete note?</span>
                    <button
                      onClick={() => deleteNote.mutate({ id: selectedId })}
                      disabled={deleteNote.isPending}
                      className="rounded-md bg-neg px-2.5 py-1 font-medium text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {deleteNote.isPending ? 'Deleting…' : 'Confirm'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="text-text-tertiary hover:text-text-primary">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <Button onClick={() => updateNote.mutate({ id: selectedId, title, content })} disabled={updateNote.isPending}>
                    {updateNote.isPending ? 'Saving...' : 'Save'}
                  </Button>
                )}
                {selectedNote && !confirmDelete && (
                  <span className="text-xs text-text-tertiary">
                    Updated {new Date(selectedNote.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
