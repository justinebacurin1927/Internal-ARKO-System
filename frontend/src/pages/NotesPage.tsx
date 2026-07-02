import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import { Button } from '../components/Button'
import { useToast } from '../lib/toast'
import ConfirmDialog from '../components/ConfirmDialog'
import { Plus, Trash2, FileText, AlertCircle, Search } from 'lucide-react'

export default function NotesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: notes, isLoading, error } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.getNotes(),
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [noteSearch, setNoteSearch] = useState('')

  const createNote = useMutation({
    mutationFn: () => api.createNote({ title: 'Untitled', content: '' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      selectNote(data)
      toast('Note created')
    },
  })

  const updateNote = useMutation({
    mutationFn: () => api.updateNote(selectedId!, { title, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast('Note saved')
    },
  })

  const deleteNote = useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      if (selectedId === deletedId) {
        setSelectedId(null)
        setTitle('')
        setContent('')
      }
      toast('Note deleted')
    },
  })

  const { data: selectedNote } = useQuery({
    queryKey: ['note', selectedId],
    queryFn: () => api.getNote(selectedId!),
    enabled: !!selectedId,
  })

  const selectNote = (note: any) => {
    setSelectedId(note.id)
    setTitle(note.title)
    setContent(note.content)
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4" />
        Failed to load notes
      </div>
    )
  }

  if (isLoading) return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-start justify-between shrink-0">
        <div>
          <div className="h-7 w-24 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-40 animate-pulse rounded bg-gray-100 mt-1" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-64 shrink-0 rounded-2xl bg-gray-50 p-3 space-y-2 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-gray-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-2xl bg-gray-50 p-5 space-y-3">
          <div className="h-6 w-1/3 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notes</h1>
          <p className="text-sm text-gray-500 mt-1">Write and manage your notes</p>
        </div>
        <Button onClick={() => createNote.mutate()}>
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      {notes?.length === 0 && (
        <div className="text-center py-12 shrink-0">
          <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">No notes yet</p>
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Notes list */}
        <Card className="w-64 shrink-0 overflow-hidden flex flex-col">
          <CardHeader className="p-3 border-b border-gray-100 space-y-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">All Notes</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                placeholder="Filter notes..."
                className="block w-full rounded-md border border-gray-200 pl-7 pr-2 py-1.5 text-xs focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/20"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {(notes ?? []).filter((n: any) =>
              !noteSearch || n.title?.toLowerCase().includes(noteSearch.toLowerCase())
            ).map((note: any) => (
              <button
                key={note.id}
                onClick={() => selectNote(note)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  selectedId === note.id ? 'bg-accent-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{note.title || 'Untitled'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(note.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-gray-300" />
                </div>
                <p className="text-sm">Select or create a note</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-5">
              <div className="flex items-center justify-between mb-4">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                  className="text-lg font-bold text-gray-900 bg-transparent border-none focus:outline-none w-full"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDelete(true)}
                  className="text-gray-300 hover:text-red-500 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing..."
                className="flex-1 w-full resize-none border-none bg-transparent text-sm text-gray-700 focus:outline-none leading-relaxed"
              />
              <div className="pt-3 border-t border-gray-100 mt-3 flex items-center justify-between">
                <Button
                  onClick={() => updateNote.mutate()}
                  disabled={updateNote.isPending}
                >
                  {updateNote.isPending ? 'Saving...' : 'Save'}
                </Button>
                {selectedNote && (
                  <span className="text-xs text-gray-400">
                    Updated {new Date(selectedNote.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete note?"
        message={`Are you sure you want to delete "${title || 'Untitled'}"? This cannot be undone.`}
        onConfirm={() => {
          deleteNote.mutate(selectedId!)
          setConfirmDelete(false)
        }}
        onCancel={() => setConfirmDelete(false)}
        loading={deleteNote.isPending}
      />
    </div>
  )
}