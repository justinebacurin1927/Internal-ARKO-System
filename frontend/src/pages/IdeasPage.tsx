import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'
import {
  Plus, Lightbulb, Trash2, Edit3, X, CheckCircle2,
  Tag, ListTodo,
} from 'lucide-react'

const STATUSES = ['IDEA', 'PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'] as const
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  IDEA:        { label: 'Idea',        color: '#8B5CF6', bg: 'bg-purple-50' },
  PLANNING:    { label: 'Planning',    color: '#3B82F6', bg: 'bg-blue-50' },
  IN_PROGRESS: { label: 'In Progress', color: '#F59E0B', bg: 'bg-amber-50' },
  COMPLETED:   { label: 'Completed',   color: '#10B981', bg: 'bg-emerald-50' },
  ARCHIVED:    { label: 'Archived',    color: '#6B7280', bg: 'bg-gray-50' },
}

export default function IdeasPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const { data: ideas, isLoading } = useQuery({
    queryKey: ['ideas', statusFilter],
    queryFn: () => api.getIdeas(statusFilter || undefined),
  })

  const createIdea = useMutation({
    mutationFn: () => api.createIdea({
      title: title.trim(), description: desc.trim() || undefined,
      tags: tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => { reset(); queryClient.invalidateQueries({ queryKey: ['ideas'] }); toast('Idea created') },
  })

  const updateIdea = useMutation({
    mutationFn: () => api.updateIdea(editing!, {
      title: title.trim(), description: desc.trim(),
      tags: tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => { reset(); queryClient.invalidateQueries({ queryKey: ['ideas'] }); toast('Idea updated') },
  })

  const deleteIdea = useMutation({
    mutationFn: (id: string) => api.deleteIdea(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas'] }),
  })

  const spawnTask = useMutation({
    mutationFn: (id: string) => api.spawnTaskFromIdea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast('Task created from idea')
    },
  })

  const reset = () => { setShowForm(false); setEditing(null); setTitle(''); setDesc(''); setTagsStr('') }
  const openNew = () => { reset(); setShowForm(true) }
  const openEdit = (idea: any) => {
    setEditing(idea.id); setTitle(idea.title); setDesc(idea.description || '')
    setTagsStr((idea.tags || []).join(', ')); setShowForm(true)
  }

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-bold text-text-primary tracking-tight">R&amp;D Ideas</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Brainstorm, plan, and turn ideas into tasks</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11px] bg-white text-text-secondary focus:border-accent-400 focus:outline-none">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-500 active:scale-[0.97] cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> New Idea
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); editing ? updateIdea.mutate() : createIdea.mutate() }}
          className="shrink-0 rounded-xl border border-accent-200 bg-white p-3 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-purple-500 shrink-0" />
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your idea?" required autoFocus
              className="flex-1 rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/10" />
            <button type="button" onClick={reset} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Describe your idea..." rows={3}
            className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm bg-white placeholder:text-text-tertiary focus:border-accent-400 focus:outline-none resize-none" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-3 w-3 text-text-tertiary" />
              <input type="text" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)}
                placeholder="Tags (comma-separated)"
                className="rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11px] w-48 focus:border-accent-400 focus:outline-none" />
            </div>
            <button type="submit" disabled={!title.trim() || createIdea.isPending || updateIdea.isPending}
              className="rounded-lg bg-accent-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-accent-500 transition-all disabled:opacity-40 cursor-pointer">
              {editing ? 'Update' : 'Save Idea'}
            </button>
          </div>
        </form>
      )}

      {/* Ideas grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        ) : ideas && ideas.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {ideas.map((idea: any) => {
              const meta = STATUS_META[idea.status] || STATUS_META.IDEA
              const isExpanded = expanded.has(idea.id)
              return (
                <div key={idea.id} className={`rounded-xl border ${meta.bg} bg-white p-3 transition-all hover:shadow-sm`}
                  style={{ borderColor: `${meta.color}20` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                        <h3 className="text-xs font-semibold text-text-primary">{idea.title}</h3>
                      </div>
                      {idea.description && (
                        <p className={`text-[11px] text-text-secondary mt-1.5 ${isExpanded ? '' : 'line-clamp-2'}`}
                          onClick={() => setExpanded((prev) => { const next = new Set(prev); isExpanded ? next.delete(idea.id) : next.add(idea.id); return next })}>
                          {idea.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {idea.tags && idea.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {idea.tags.map((tag: string, i: number) => (
                        <span key={i} className="inline-flex items-center rounded-full bg-accent-50 px-1.5 py-[1px] text-[8px] font-medium text-accent-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-black/[0.04]">
                    {/* Status badge */}
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium"
                      style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                      {meta.label}
                    </span>

                    <div className="flex gap-0.5">
                      {/* Spawn task */}
                      {!idea.spawned_task_id && (
                        <button onClick={() => spawnTask.mutate(idea.id)}
                          disabled={spawnTask.isPending}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:text-accent-600 hover:bg-accent-50 transition-all cursor-pointer"
                          title="Convert to task">
                          <ListTodo className="h-3 w-3" />
                        </button>
                      )}
                      {idea.spawned_task_id && (
                        <button disabled
                          className="flex h-6 w-6 items-center justify-center rounded-md text-pos cursor-default"
                          title="Task spawned">
                          <CheckCircle2 className="h-3 w-3" />
                        </button>
                      )}
                      <button onClick={() => openEdit(idea)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:text-accent-600 hover:bg-accent-50 transition-all cursor-pointer">
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button onClick={() => deleteIdea.mutate(idea.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:text-neg hover:bg-neg-bg transition-all cursor-pointer">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Lightbulb className="h-8 w-8 text-gray-200 mb-2" />
            <p className="text-sm font-medium text-text-primary">No ideas yet</p>
            <p className="text-xs text-text-tertiary mt-1">Start brainstorming!</p>
          </div>
        )}
      </div>
    </div>
  )
}
