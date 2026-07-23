'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@arko/ui'
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react'
import { api } from '../../../../lib/trpc/client'

export default function NoteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const noteId = params.id as string

  const { data: note, isLoading, error } = api.notes.get.useQuery({ id: noteId })
  const updateNote = api.notes.update.useMutation()
  const deleteNote = api.notes.delete.useMutation({
    onSuccess: () => {
      router.push('/dashboard/notes')
    },
  })

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setDirty(false)
    }
  }, [note])

  const save = () => {
    if (!dirty || !note) return
    setSaving(true)
    updateNote.mutate(
      { id: note.id, title, content },
      {
        onSettled: () => {
          setSaving(false)
          setDirty(false)
        },
      },
    )
  }

  const handleTitleChange = (val: string) => {
    setTitle(val)
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(save, 2000)
  }

  const handleContentChange = (val: string) => {
    setContent(val)
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(save, 2000)
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-card" />
        <div className="h-96 animate-pulse rounded-xl bg-card" />
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="flex items-center justify-center gap-4 py-24">
        <p className="text-sm text-text-tertiary">Note not found</p>
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/notes')}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/notes')}
            className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-card hover:text-text-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {saving ? (
              <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            ) : dirty ? (
              <span className="text-xs text-text-tertiary">Unsaved changes</span>
            ) : (
              <span className="text-xs text-primary-600">Saved</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={save} disabled={!dirty}>
            <Save className="mr-1 h-4 w-4" />
            Save
          </Button>
          <button
            onClick={() => {
              if (confirm('Delete this note?')) {
                deleteNote.mutate({ id: note.id })
              }
            }}
            className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-neg-bg hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-2xl border border-border-subtle bg-card">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          className="w-full border-b border-border-subtle px-8 py-6 text-2xl font-bold text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start writing..."
          className="min-h-[400px] w-full resize-y px-8 py-6 text-sm leading-relaxed text-text-secondary placeholder:text-text-muted focus:outline-none"
        />
      </div>
    </div>
  )
}
