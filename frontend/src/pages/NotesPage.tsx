import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import { Button } from '../components/Button'
import { Plus, Trash2, FileText, AlertCircle } from 'lucide-react'

export default function NotesPage() {
  const queryClient = useQueryClient()
  const { data: notes, isLoading, error } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.getNotes(),
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const createNote = useMutation({
    mutationFn: () => api.createNote({ title: 'Untitled', content: '' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      selectNote(data)
    },
  })

  const updateNote = useMutation({
    mutationFn: () => api.updateNote(selectedId!, { title, content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
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

  if (isLoading) return <div className="text-sm text-gray-400">Loading notes...</div>

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
          <CardHeader className="p-3 border-b border-gray-100">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">All Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {notes?.map((note: any) => (
              <button
                key={note.id}
                onClick={() => selectNote(note)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  selectedId === note.id ? 'bg-primary-50' : 'hover:bg-gray-50'
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
                  onClick={() => deleteNote.mutate(selectedId!)}
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
    </div>
  )
}