'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Button } from '@arko/ui'
import {
  Link2,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  ExternalLink,
  Paperclip,
  Search,
  Folder,
  Bookmark,
  FileText,
  Video,
  Palette,
  Newspaper,
  Wrench,
  Lock,
  Globe,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { api } from '../../../lib/trpc/client'
import { FileUploader } from '../../../components/file-uploader'
import { AttachmentList } from '../../../components/attachment-list'
import { ResourcesForm } from './resources-form'

const RESOURCE_TYPE = 'RESOURCE'
const PAGE_SIZE = 20

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder,
  Bookmark,
  FileText,
  Video,
  Palette,
  Newspaper,
  Wrench,
}

const QUICK_ICONS = ['Folder', 'Bookmark', 'FileText', 'Video', 'Palette', 'Newspaper', 'Wrench']

function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Folder
  return <Icon className={className} />
}

export default function ResourcesPage() {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [editResource, setEditResource] = useState<{
    title: string
    url: string
    description: string
    categoryId?: string
    isPublic: boolean
  }>()
  const [error, setError] = useState('')
  const [showAttachments, setShowAttachments] = useState<Set<string>>(new Set())
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('Folder')
  const [newCatPublic, setNewCatPublic] = useState(true)

  // Search + filter + pagination
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [page, setPage] = useState(1)

  // Debounce the search box; reset to page 1 on any query change.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])
  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter])

  const toggleAttachments = (id: string) => {
    setShowAttachments((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { data, isLoading } = api.resources.list.useQuery({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    categoryId: categoryFilter,
  })
  const { data: categories } = api.resources.listCategories.useQuery()
  const utils = api.useUtils()

  const invalidateAll = () => {
    utils.resources.list.invalidate()
    utils.resources.listCategories.invalidate()
  }

  const onMutationDone = () => {
    setError('')
    setEditId(undefined)
    setEditResource(undefined)
    setShowForm(false)
    invalidateAll()
  }

  const create = api.resources.create.useMutation({
    onSuccess: onMutationDone,
    onError: (e) => setError(e.message),
  })
  const update = api.resources.update.useMutation({
    onSuccess: onMutationDone,
    onError: (e) => setError(e.message),
  })
  const del = api.resources.delete.useMutation({
    onSuccess: invalidateAll,
    onError: (e) => setError(e.message),
  })
  const createCategory = api.resources.createCategory.useMutation({
    onSuccess: () => {
      setNewCatName('')
      setNewCatIcon('Folder')
      setNewCatPublic(true)
      setShowCategoryForm(false)
      utils.resources.listCategories.invalidate()
    },
  })
  const deleteCategory = api.resources.deleteCategory.useMutation({
    onSuccess: invalidateAll,
  })

  const isSaving = create.isPending || update.isPending

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  const handleFormSubmit = (formData: {
    title: string
    url?: string
    description?: string
    categoryId?: string
    isPublic: boolean
  }) => {
    if (editId) update.mutate({ id: editId, ...formData })
    else create.mutate(formData)
  }

  const startEdit = (r: (typeof items)[number]) => {
    setEditId(r.id)
    setEditResource({
      title: r.title,
      url: r.url ?? '',
      description: r.description ?? '',
      categoryId: r.categoryId ?? undefined,
      isPublic: r.isPublic,
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Resources</h1>
          <p className="mt-1 text-sm text-text-tertiary">
            Shared links and references · {total} item{total === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditId(undefined)
            setEditResource(undefined)
            setShowForm(!showForm)
          }}
        >
          {showForm && !editId ? (
            'Cancel'
          ) : (
            <>
              <Plus className="h-4 w-4" /> New
            </>
          )}
        </Button>
      </div>

      {/* Inline form */}
      {showForm && (
        <ResourcesForm
          categories={categories ?? []}
          editId={editId}
          initialTitle={editResource?.title ?? ''}
          initialUrl={editResource?.url ?? ''}
          initialDescription={editResource?.description ?? ''}
          initialCategoryId={editResource?.categoryId}
          initialIsPublic={editResource?.isPublic ?? true}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setEditId(undefined)
            setEditResource(undefined)
            setShowForm(false)
          }}
          isSaving={isSaving}
          error={error}
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search resources by title, notes, or tag…"
          className="block w-full rounded-lg border border-border-subtle bg-card py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category "boxes" — click one to open it */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategoryFilter(undefined)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            !categoryFilter
              ? 'bg-primary-600/20 text-white'
              : 'bg-card text-text-secondary border border-border-subtle hover:text-text-primary'
          }`}
        >
          All
        </button>
        {(categories ?? []).map((cat) => (
          <div
            key={cat.id}
            className={`group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === cat.id
                ? 'bg-primary-600/20 text-white'
                : 'bg-card text-text-secondary border border-border-subtle hover:text-text-primary'
            }`}
          >
            <button
              onClick={() => setCategoryFilter(cat.id)}
              className="flex items-center gap-1.5"
            >
              <CategoryIcon name={cat.icon} className="h-3.5 w-3.5 text-text-muted" />
              {cat.name}
              {!cat.isPublic && <Lock className="h-3 w-3 text-text-muted" />}
              <span className="rounded-full bg-black/20 px-1.5 text-[10px]">{cat.count}</span>
            </button>
            {cat.canManage && (
              <button
                onClick={() => {
                  if (confirm(`Delete category "${cat.name}"? Resources inside are kept, uncategorized.`))
                    deleteCategory.mutate({ id: cat.id })
                }}
                className="ml-0.5 rounded-full p-0.5 text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {/* Add category */}
        {showCategoryForm ? (
          <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 border border-border-subtle">
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Box name…"
              className="w-28 rounded border border-border-subtle px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
              autoFocus
            />
            <select
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              className="rounded border border-border-subtle px-2 py-1 text-xs"
            >
              {QUICK_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-[11px] text-text-secondary">
              <input
                type="checkbox"
                checked={newCatPublic}
                onChange={(e) => setNewCatPublic(e.target.checked)}
                className="h-3 w-3"
              />
              Public
            </label>
            <Button
              size="sm"
              onClick={() => {
                if (!newCatName.trim()) return
                createCategory.mutate({
                  name: newCatName.trim(),
                  icon: newCatIcon,
                  isPublic: newCatPublic,
                })
              }}
              disabled={createCategory.isPending || !newCatName.trim()}
            >
              {createCategory.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
            </Button>
            <button
              onClick={() => {
                setShowCategoryForm(false)
                setNewCatName('')
              }}
              className="text-text-muted hover:text-text-secondary transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCategoryForm(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-border-subtle px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-secondary hover:border-text-muted transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Box
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed border-border-subtle">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Link2 className="mb-3 h-8 w-8 text-text-muted" />
            <p className="text-sm text-text-tertiary">
              {search || categoryFilter ? 'No matching resources' : 'No resources yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border-subtle">
              {items.map((r) => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-text-primary">{r.title}</p>
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-600 hover:text-primary-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {r.isPublic ? (
                          <Globe className="h-3 w-3 text-text-muted" aria-label="Public" />
                        ) : (
                          <Lock className="h-3 w-3 text-workflow-500" aria-label="Private" />
                        )}
                      </div>
                      {r.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-text-tertiary">{r.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
                        {r.category && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5">
                            <CategoryIcon name={r.category.icon} className="h-2.5 w-2.5" />
                            {r.category.name}
                          </span>
                        )}
                        {r.ownerName && <span>by {r.ownerName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => toggleAttachments(r.id)}
                        title="Attachments"
                        className={`rounded-lg p-1.5 ${
                          showAttachments.has(r.id)
                            ? 'bg-accent-50 text-accent-600'
                            : 'text-text-muted hover:bg-card hover:text-text-tertiary'
                        } transition-colors`}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </button>
                      {r.canManage && (
                        <>
                          <button
                            onClick={() => startEdit(r)}
                            className="rounded-lg p-1.5 text-text-muted hover:bg-card hover:text-text-secondary transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => confirm('Delete this resource?') && del.mutate({ id: r.id })}
                            className="rounded-lg p-1.5 text-text-muted hover:bg-neg-bg hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {showAttachments.has(r.id) && (
                    <div className="mt-3 border-t border-border-subtle pt-3">
                      <AttachmentList resourceType={RESOURCE_TYPE} resourceId={r.id} />
                      <div className="mt-2">
                        <FileUploader resourceType={RESOURCE_TYPE} resourceId={r.id} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-xs text-text-tertiary">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
