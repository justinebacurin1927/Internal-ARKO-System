'use client'

import { useState } from 'react'
import { Card, CardContent, Button } from '@arko/ui'
import { AlertCircle, Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  icon: string
}

interface ResourcesFormProps {
  categories: Category[]
  editId?: string
  initialTitle?: string
  initialUrl?: string
  initialDescription?: string
  initialCategoryId?: string
  initialIsPublic?: boolean
  onSubmit: (data: {
    title: string
    url?: string
    description?: string
    categoryId?: string
    isPublic: boolean
  }) => void
  onCancel: () => void
  isSaving: boolean
  error: string
}

export function ResourcesForm({
  categories,
  editId,
  initialTitle = '',
  initialUrl = '',
  initialDescription = '',
  initialCategoryId,
  initialIsPublic = true,
  onSubmit,
  onCancel,
  isSaving,
  error,
}: ResourcesFormProps) {
  const [title, setTitle] = useState(initialTitle)
  const [url, setUrl] = useState(initialUrl)
  const [description, setDescription] = useState(initialDescription)
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? '')
  const [isPublic, setIsPublic] = useState(initialIsPublic)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      url: url.trim() || undefined,
      description: description || undefined,
      categoryId: categoryId || undefined,
      isPublic,
    })
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <p className="mb-3 text-xs font-medium text-text-tertiary">
          {editId ? 'Edit Resource' : 'New Resource'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resource title..."
            autoFocus
            required
            className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />

          {/* Category selector */}
          {categories.length > 0 && (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          {/* Public / private toggle */}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border-subtle"
            />
            <span>
              {isPublic ? 'Public' : 'Private'} —{' '}
              <span className="text-text-tertiary">
                {isPublic ? 'visible to everyone' : 'only you can see this'}
              </span>
            </span>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <p className="text-[11px] text-red-600">{error}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : editId ? (
                'Save Changes'
              ) : (
                'Add'
              )}
            </Button>
            {editId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}