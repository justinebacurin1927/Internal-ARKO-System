import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'
import {
  Plus, Book, Trash2, Edit3, X, Loader2, Smile, Frown,
  Meh, Angry, Heart,
} from 'lucide-react'

const MOODS = [
  { key: 'GREAT', icon: Heart, label: 'Great', color: 'text-red-400' },
  { key: 'GOOD', icon: Smile, label: 'Good', color: 'text-green-400' },
  { key: 'NEUTRAL', icon: Meh, label: 'Neutral', color: 'text-yellow-400' },
  { key: 'ROUGH', icon: Frown, label: 'Rough', color: 'text-orange-400' },
  { key: 'TOUGH', icon: Angry, label: 'Tough', color: 'text-red-600' },
]

export default function JournalPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showEditor, setShowEditor] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')

  const { data: entries, isLoading } = useQuery({
    queryKey: ['journal'],
    queryFn: () => api.getJournalEntries(),
  })

  const createEntry = useMutation({
    mutationFn: () => api.createJournalEntry({ title: title.trim(), content: content.trim() || undefined, mood: mood || undefined }),
    onSuccess: () => {
      reset(), queryClient.invalidateQueries({ queryKey: ['journal'] }), toast('Entry saved')
    },
  })

  const updateEntry = useMutation({
    mutationFn: () => api.updateJournalEntry(editing!, { title: title.trim(), content: content.trim(), mood: mood || undefined }),
    onSuccess: () => {
      reset(), queryClient.invalidateQueries({ queryKey: ['journal'] }), toast('Entry updated')
    },
  })

  const deleteEntry = useMutation({
    mutationFn: (id: string) => api.deleteJournalEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['journal'] }),
  })

  const reset = () => {
    setShowEditor(false); setEditing(null); setTitle(''); setContent(''); setMood('')
  }

  const openNew = () => { reset(); setShowEditor(true) }
  const openEdit = (e: any) => {
    setEditing(e.id); setTitle(e.title); setContent(e.content || ''); setMood(e.mood || ''); setShowEditor(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    editing ? updateEntry.mutate() : createEntry.mutate()
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-bold text-text-primary tracking-tight">Journal</h1>
          <p className="text-xs text-text-tertiary mt-0.5">{today}</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-500 active:scale-[0.97] cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> New Entry
        </button>
      </div>

      {/* Editor */}
      {showEditor && (
        <form onSubmit={handleSubmit} className="shrink-0 rounded-xl border border-accent-200 bg-white p-3 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Entry title..." required autoFocus
              className="flex-1 rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/10"
            />
            <button type="button" onClick={reset}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary transition-all cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={6}
            className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm bg-white placeholder:text-text-tertiary focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/10 resize-none"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-tertiary font-medium mr-1">Mood:</span>
              {MOODS.map((m) => (
                <button
                  key={m.key} type="button"
                  onClick={() => setMood(mood === m.key ? '' : m.key)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition-all cursor-pointer ${
                    mood === m.key ? 'ring-2 ring-accent-500 bg-accent-50 scale-110' : 'hover:bg-gray-50'
                  }`}
                  title={m.label}
                >
                  <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                </button>
              ))}
            </div>
            <button type="submit" disabled={!title.trim() || createEntry.isPending || updateEntry.isPending}
              className="rounded-lg bg-accent-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-accent-500 transition-all disabled:opacity-40 cursor-pointer">
              {(createEntry.isPending || updateEntry.isPending) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5">
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}</div>
        ) : entries && entries.length > 0 ? (
          entries.map((e: any) => {
            const moodData = MOODS.find((m) => m.key === e.mood)
            const date = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            return (
              <div key={e.id} className="group rounded-xl border border-border-subtle bg-white p-3 hover:border-accent-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {moodData && <moodData.icon className={`h-3.5 w-3.5 ${moodData.color}`} />}
                      <h3 className="text-sm font-semibold text-text-primary">{e.title}</h3>
                    </div>
                    {e.content && (
                      <p className="text-xs text-text-secondary mt-1.5 whitespace-pre-wrap line-clamp-3">{e.content}</p>
                    )}
                    <p className="text-[10px] text-text-tertiary mt-2">{date}</p>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(e)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:text-accent-600 hover:bg-accent-50 transition-all cursor-pointer">
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button onClick={() => deleteEntry.mutate(e.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:text-neg hover:bg-neg-bg transition-all cursor-pointer">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Book className="h-8 w-8 text-gray-200 mb-2" />
            <p className="text-sm font-medium text-text-primary">No journal entries yet</p>
            <p className="text-xs text-text-tertiary mt-1">Start writing about your day</p>
          </div>
        )}
      </div>
    </div>
  )
}
