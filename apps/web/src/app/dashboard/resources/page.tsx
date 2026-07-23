'use client'

import { useState } from 'react'
import { Card, CardContent, Button } from '@arko/ui'
import { Link2, Plus, Trash2, Pencil, Loader2, ExternalLink, Paperclip, AlertCircle } from 'lucide-react'
import { api } from '../../../lib/trpc/client'
import { FileUploader } from '../../../components/file-uploader'
import { AttachmentList } from '../../../components/attachment-list'

const RESOURCE_TYPE = 'RESOURCE'

export default function ResourcesPage() {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | undefined>()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [showAttachments, setShowAttachments] = useState<Set<string>>(new Set())

  const toggleAttachments = (id: string) => {
    setShowAttachments((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { data: resources, isLoading } = api.resources.list.useQuery()
  const utils = api.useUtils()

  const create = api.resources.create.useMutation({
    onSuccess: () => {
      setError('')
      setTitle('')
      setUrl('')
      setDescription('')
      setEditId(undefined)
      setShowForm(false)
      utils.resources.list.invalidate()
    },
    onError: (e) => setError(e.message),
  })
  const update = api.resources.update.useMutation({
    onSuccess: () => {
      setError('')
      setTitle('')
      setUrl('')
      setDescription('')
      setEditId(undefined)
      setShowForm(false)
      utils.resources.list.invalidate()
    },
    onError: (e) => setError(e.message),
  })
  const del = api.resources.delete.useMutation({
    onSuccess: () => utils.resources.list.invalidate(),
    onError: (e) => setError(e.message),
  })

  const isSaving = create.isPending || update.isPending

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Resources</h1>
          <p className="mt-1 text-sm text-gray-500">Links and references</p>
        </div>
        <Button size="sm" onClick={() => { setEditId(undefined); setShowForm(!showForm) }}>
          {showForm && !editId ? 'Cancel' : <><Plus className="h-4 w-4" /> New</>}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="mb-3 text-xs font-medium text-gray-500">{editId ? 'Edit Resource' : 'New Resource'}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!title.trim()) return
                const payload = {
                  title: title.trim(),
                  url: url.trim() || undefined,
                  description: description || undefined,
                }
                if (editId) {
                  update.mutate({ id: editId, ...payload })
                } else {
                  create.mutate(payload)
                }
              }}
              className="space-y-3"
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resource title..."
                autoFocus
                required
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <p className="text-[11px] text-red-600">{error}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : editId ? 'Save Changes' : 'Add'}
                </Button>
                {editId && (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setEditId(undefined); setTitle(''); setUrl(''); setDescription(''); setShowForm(false) }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : resources?.length === 0 ? (
        <Card className="border-dashed border-gray-200">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Link2 className="mb-3 h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-400">No resources yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {resources?.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">{r.title}</p>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-700">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {r.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => {
                        setEditId(r.id)
                        setTitle(r.title)
                        setUrl(r.url ?? '')
                        setDescription(r.description ?? '')
                        setShowForm(true)
                      }}
                      className="rounded-lg p-1.5 text-gray-300 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleAttachments(r.id)}
                      title="Attachments"
                      className={`rounded-lg p-1.5 ${
                        showAttachments.has(r.id)
                          ? 'bg-accent-50 text-accent-600'
                          : 'text-gray-300 hover:bg-gray-50 hover:text-gray-500'
                      }`}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => confirm('Delete this resource?') && del.mutate({ id: r.id })}
                      className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {showAttachments.has(r.id) && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <AttachmentList resourceType={RESOURCE_TYPE} resourceId={r.id} />
                    <div className="mt-2">
                      <FileUploader
                        resourceType={RESOURCE_TYPE}
                        resourceId={r.id}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
