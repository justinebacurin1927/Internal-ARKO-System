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
  const [noteView, setNoteView] = useState<'ALL' | 'RECENT'>('ALL')

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

  const filtered = (notes ?? [])
    .filter((note) => !noteSearch || note.title?.toLowerCase().includes(noteSearch.toLowerCase()))
    .sort((a, b) => noteView === 'RECENT'
      ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      : a.title.localeCompare(b.title))

  return (
    <div className="notes-reference mx-auto flex h-full w-full max-w-[1500px] flex-col gap-4">
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Notes workspace</h1>
          <p className="text-sm text-text-tertiary mt-1">Capture ideas, decisions, and project knowledge.</p>
        </div>
        <Button className="rounded-full px-5" onClick={() => createNote.mutate({ title: 'Untitled', content: '' })}>
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      <div className="notes-view-bar">
        {([['ALL', 'All notes'], ['RECENT', 'Recently updated']] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={noteView === value}
            onClick={() => setNoteView(value)}
            className={`notes-view-chip ${noteView === value ? 'notes-view-chip-active' : ''}`}
          >
            <FileText className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-text-tertiary">{notes?.length ?? 0} notes</span>
      </div>

      {notes?.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-14 w-14 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
              <FileText className="h-6 w-6 text-text-tertiary" />
            </div>
            <p className="text-sm text-text-tertiary mb-4">No notes yet</p>
            <Button onClick={() => createNote.mutate({ title: 'Untitled', content: '' })}>
              <Plus className="h-4 w-4" />
              Create your first note
            </Button>
          </div>
        </div>
      ) : (
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Notes list */}
        <Card className={`notes-panel w-80 shrink-0 overflow-hidden flex-col ${selectedId ? 'hidden md:flex' : 'flex w-full md:w-80'}`}>
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
                className={`m-1.5 w-[calc(100%-0.75rem)] rounded-xl border px-3 py-3 text-left transition-colors ${
                  selectedId === note.id
                    ? 'border-primary-500/35 bg-primary-500/[0.08]'
                    : 'border-white/[0.05] bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03]'
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
        <Card className={`notes-panel flex-1 overflow-hidden flex-col ${!selectedId ? 'hidden md:flex' : 'flex w-full md:flex'}`}>
          {!selectedId && notes && notes.length > 0 ? (
            <div className="flex-1 flex items-center justify-center text-text-tertiary">
              <div className="text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-text-muted" />
                <p className="text-sm">Select a note to edit</p>
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
                      onClick={() => deleteNote.mutate({ id: selectedId! })}
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
                  <Button onClick={() => updateNote.mutate({ id: selectedId!, title, content })} disabled={updateNote.isPending}>
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
      )}
    </div>
  )
}
