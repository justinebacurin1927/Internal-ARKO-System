import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Plus, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { useToast } from '../lib/toast'

interface SubtaskListProps {
  parentId: string
  subtasks: Array<{ id: string; title: string; status: string }>
  onUpdate?: () => void
}

export default function SubtaskList({ parentId, subtasks, onUpdate }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('')
  const [showNew, setShowNew] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const createSubtask = useMutation({
    mutationFn: () =>
      api.createTask({
        title: newTitle.trim(),
        parent: parentId,
        status: 'TODO',
      }),
    onSuccess: () => {
      setNewTitle('')
      setShowNew(false)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast('Subtask created')
      onUpdate?.()
    },
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateTask(id, { status: status === 'DONE' ? 'TODO' : 'DONE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onUpdate?.()
    },
  })

  return (
    <div className="space-y-1">
      {subtasks.length === 0 && !showNew && (
        <p className="text-xs text-text-tertiary py-2">No subtasks</p>
      )}

      {subtasks.map((st) => (
        <div key={st.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent-50/40">
          <button
            onClick={() => toggleStatus.mutate({ id: st.id, status: st.status })}
            className="shrink-0 text-text-tertiary hover:text-accent-500 transition-colors cursor-pointer"
          >
            {st.status === 'DONE' ? (
              <CheckCircle2 className="h-4 w-4 text-pos" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </button>
          <span className={`text-xs flex-1 min-w-0 ${st.status === 'DONE' ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
            {st.title}
          </span>
        </div>
      ))}

      {showNew ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newTitle.trim()) createSubtask.mutate()
          }}
          className="flex items-center gap-2 px-2 py-1"
        >
          <Circle className="h-4 w-4 shrink-0 text-text-tertiary" />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
            className="min-w-0 flex-1 rounded border border-border-subtle bg-transparent px-2 py-1 text-xs outline-none focus:border-accent-500"
            onKeyDown={(e) => e.key === 'Escape' && setShowNew(false)}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || createSubtask.isPending}
            className="rounded px-2 py-1 text-xs font-medium text-accent-500 hover:bg-accent-50 disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {createSubtask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-tertiary hover:text-accent-500 hover:bg-accent-50/40 transition-colors cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          Add subtask
        </button>
      )}
    </div>
  )
}
