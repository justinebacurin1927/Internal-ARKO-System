import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'
import {
  Plus, Trash2, Edit3, X, Search,
  Link2, FileText, Bookmark, Globe, ExternalLink,
} from 'lucide-react'

const TYPES = [
  { key: 'LINK', icon: Link2, label: 'Link', color: 'text-blue-500' },
  { key: 'FILE', icon: FileText, label: 'File', color: 'text-purple-500' },
  { key: 'DOC', icon: Bookmark, label: 'Document', color: 'text-green-500' },
  { key: 'REF', icon: Globe, label: 'Reference', color: 'text-orange-500' },
]

export default function ResourcesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [desc, setDesc] = useState('')
  const [resourceType, setResourceType] = useState('LINK')
  const [tagsStr, setTagsStr] = useState('')

  const { data: resources, isLoading } = useQuery({
    queryKey: ['resources', typeFilter, search],
    queryFn: () => api.getResources({ type: typeFilter || undefined, q: search || undefined }),
  })

  const createResource = useMutation({
    mutationFn: () => api.createResource({
      title: title.trim(), url: url.trim() || undefined,
      description: desc.trim() || undefined, resource_type: resourceType,
      tags: tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => { reset(); queryClient.invalidateQueries({ queryKey: ['resources'] }); toast('Resource saved') },
  })

  const updateResource = useMutation({
    mutationFn: () => api.updateResource(editing!, {
      title: title.trim(), url: url.trim() || undefined,
      description: desc.trim() || undefined, resource_type: resourceType,
      tags: tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => { reset(); queryClient.invalidateQueries({ queryKey: ['resources'] }); toast('Resource updated') },
  })

  const deleteResource = useMutation({
    mutationFn: (id: string) => api.deleteResource(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  })

  const reset = () => { setShowForm(false); setEditing(null); setTitle(''); setUrl(''); setDesc(''); setTagsStr(''); setResourceType('LINK') }
  const openNew = () => { reset(); setShowForm(true) }
  const openEdit = (r: any) => {
    setEditing(r.id); setTitle(r.title); setUrl(r.url || ''); setDesc(r.description || '')
    setResourceType(r.resource_type || 'LINK'); setTagsStr((r.tags || []).join(', ')); setShowForm(true)
  }

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-sm font-bold text-text-primary tracking-tight">Resource Library</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Links, docs, and references</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-500 active:scale-[0.97] cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> Add Resource
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..." autoFocus
            className="w-full rounded-lg border border-border-subtle bg-white py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/10" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-border-subtle px-2.5 py-2 text-[11px] bg-white text-text-secondary focus:border-accent-400 focus:outline-none">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); editing ? updateResource.mutate() : createResource.mutate() }}
          className="shrink-0 rounded-xl border border-accent-200 bg-white p-3 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource title" required autoFocus
              className="flex-1 rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium focus:border-accent-400 focus:outline-none" />
            <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}
              className="rounded-lg border border-border-subtle px-2 py-1.5 text-[11px] bg-white">
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <button type="button" onClick={reset} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com (optional)"
            className="w-full rounded-lg border border-border-subtle px-3 py-2 text-xs bg-white placeholder:text-text-tertiary focus:border-accent-400 focus:outline-none" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)" rows={2}
            className="w-full rounded-lg border border-border-subtle px-3 py-2 text-xs bg-white placeholder:text-text-tertiary focus:border-accent-400 focus:outline-none resize-none" />
          <div className="flex items-center justify-between">
            <input type="text" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11px] w-48 focus:border-accent-400 focus:outline-none" />
            <button type="submit" disabled={!title.trim() || createResource.isPending || updateResource.isPending}
              className="rounded-lg bg-accent-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-accent-500 transition-all disabled:opacity-40 cursor-pointer">
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Resource list */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}</div>
        ) : resources && resources.length > 0 ? (
          resources.map((r: any) => {
            const typeMeta = TYPES.find((t) => t.key === r.resource_type) || TYPES[0]
            return (
              <div key={r.id} className="group flex items-start gap-3 rounded-xl border border-border-subtle bg-white p-3 hover:border-accent-200 transition-colors">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${typeMeta.color} bg-gray-50`}>
                  <typeMeta.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{r.title}</h3>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="text-text-tertiary hover:text-accent-600 transition-colors">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {r.description && (
                    <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">{r.description}</p>
                  )}
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {r.tags.map((tag: string, i: number) => (
                        <span key={i} className="inline-flex items-center rounded-full bg-accent-50 px-1.5 py-[1px] text-[8px] font-medium text-accent-600">{tag}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-text-tertiary mt-1">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => openEdit(r)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:text-accent-600 hover:bg-accent-50 transition-all cursor-pointer">
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button onClick={() => deleteResource.mutate(r.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:text-neg hover:bg-neg-bg transition-all cursor-pointer">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bookmark className="h-8 w-8 text-gray-200 mb-2" />
            <p className="text-sm font-medium text-text-primary">No resources yet</p>
            <p className="text-xs text-text-tertiary mt-1">Save links and references for your team</p>
          </div>
        )}
      </div>
    </div>
  )
}
