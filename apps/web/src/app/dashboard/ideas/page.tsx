'use client'

import { useState } from 'react'
import { Card, CardContent, Button } from '@arko/ui'
import { Lightbulb, Plus, Trash2, Loader2, ArrowRight } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

const STATUSES = ['IDEA', 'EXPLORING', 'VALIDATED', 'ARCHIVED'] as const

export default function IdeasPage() {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const { data: ideas, isLoading } = api.ideas.list.useQuery()
  const utils = api.useUtils()

  const create = api.ideas.create.useMutation({
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setShowForm(false)
      utils.ideas.list.invalidate()
    },
  })
  const del = api.ideas.delete.useMutation({ onSuccess: () => utils.ideas.list.invalidate() })
  const spawn = api.ideas.spawnTask.useMutation({ onSuccess: () => utils.ideas.list.invalidate() })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Ideas</h1>
          <p className="mt-1 text-sm text-gray-500">Capture and validate ideas</p>
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
                if (title.trim()) create.mutate({ title: title.trim(), description })
              }}
              className="space-y-3"
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Idea title..."
                autoFocus
                required
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe it..."
                rows={3}
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : ideas?.length === 0 ? (
        <Card className="border-dashed border-gray-200">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Lightbulb className="mb-3 h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-400">No ideas yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ideas?.map((idea) => (
            <Card key={idea.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-900">{idea.title}</p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                      {idea.status}
                    </span>
                  </div>
                  {idea.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{idea.description}</p>
                  )}
                </div>
                {!idea.spawnedTaskId && (
                  <button
                    title="Spawn task"
                    onClick={() => spawn.mutate({ id: idea.id })}
                    className="shrink-0 rounded-lg p-1 text-gray-300 hover:bg-primary-50 hover:text-primary-600"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => confirm('Delete this idea?') && del.mutate({ id: idea.id })}
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
