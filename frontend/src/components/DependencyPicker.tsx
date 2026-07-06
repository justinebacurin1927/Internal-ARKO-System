import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Search, X } from 'lucide-react'

interface DependencyPickerProps {
  currentTaskId: string
  selected: Array<{ id: string; title: string }>
  onSave: (ids: string[]) => void
  open: boolean
  onClose: () => void
}

export default function DependencyPicker({ currentTaskId, selected, onSave, open, onClose }: DependencyPickerProps) {
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selected.map((s) => s.id)))
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  })

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(selected.map((s) => s.id)))
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, selected])

  const filtered = (tasks ?? []).filter(
    (t: any) =>
      t.id !== currentTaskId &&
      t.status !== 'DONE' &&
      (!query || t.title.toLowerCase().includes(query.toLowerCase())),
  )

  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-border-subtle bg-white p-3 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-text-primary">Dependencies</h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-lg border border-border-subtle py-1.5 pl-7 pr-2 text-xs outline-none focus:border-accent-500"
          />
        </div>

        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {filtered.map((t: any) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent-50/60 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(t.id)}
                onChange={() => toggle(t.id)}
                className="rounded border-border-subtle text-accent-500 focus:ring-accent-500"
              />
              <span className="flex-1 truncate">{t.title}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="py-3 text-center text-xs text-text-tertiary">No tasks found</p>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2 border-t border-border-subtle pt-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(Array.from(selectedIds))
              onClose()
            }}
            className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-600 transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
