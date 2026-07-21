'use client'

import { useState } from 'react'
import { Card, CardContent, Button } from '@arko/ui'
import { Link2, Plus, Trash2, Loader2, ExternalLink } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

export default function ResourcesPage() {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')

  const { data: resources, isLoading } = api.resources.list.useQuery()
  const utils = api.useUtils()

  const create = api.resources.create.useMutation({
    onSuccess: () => {
      setTitle('')
      setUrl('')
      setDescription('')
      setShowForm(false)
      utils.resources.list.invalidate()
    },
  })
  const del = api.resources.delete.useMutation({ onSuccess: () => utils.resources.list.invalidate() })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Resources</h1>
          <p className="mt-1 text-sm text-gray-500">Links and references</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (title.trim())
                  create.mutate({
                    title: title.trim(),
                    url: url.trim() || undefined,
                    description: description || undefined,
                  })
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
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
              </Button>
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
              <CardContent className="flex items-start gap-3 p-4">
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
                <button
                  onClick={() => confirm('Delete this resource?') && del.mutate({ id: r.id })}
                  className="shrink-0 rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
