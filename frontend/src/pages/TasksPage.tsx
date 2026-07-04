import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent } from '../components/Card'
import { Button } from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import CommentSection from '../components/CommentSection'
import { useToast } from '../lib/toast'
import {
  Plus, AlertCircle, User, Loader2, Trash2, Search, GripVertical,
  ChevronDown, ChevronRight, Subscript, MessageSquare,
} from 'lucide-react'
import {
  DragDropContext, Droppable, Draggable,
  type DropResult,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableProvided,
  type DroppableStateSnapshot,
} from '@hello-pangea/dnd'

const columns = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const

const columnMeta: Record<string, { label: string; color: string; bg: string }> = {
  TODO:        { label: 'To Do',        color: '#A3AC9E', bg: 'bg-black/[0.02]' },
  IN_PROGRESS: { label: 'In Progress',  color: '#2D6A4F', bg: 'bg-accent-500/[0.03]' },
  REVIEW:      { label: 'Review',       color: '#C9954A', bg: 'bg-warn/[0.03]' },
  DONE:        { label: 'Done',         color: '#5FA87A', bg: 'bg-pos/[0.03]' },
}

/* ─── Priority pill ─── */

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    URGENT:  'bg-neg-bg text-neg',
    HIGH:    'bg-warn-bg text-warn',
    MEDIUM:  'bg-accent-50 text-accent-700',
    LOW:     'bg-gray-50 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[priority] ?? 'bg-gray-50 text-gray-500'}`}>
      {priority}
    </span>
  )
}

/* ─── Task card ─── */

function TaskCard({ task, index, onDelete, expanded, onToggleExpand }: {
  task: any; index: number; onDelete: (id: string) => void;
  expanded?: boolean; onToggleExpand?: () => void;
}) {
  const [showComments, setShowComments] = useState(false)
  return (
    <Draggable draggableId={task.id.toString()} index={index}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`rounded-lg ${
            snapshot.isDragging
              ? 'shadow-[0_12px_28px_rgba(26,29,26,0.15),0_4px_12px_rgba(26,29,26,0.1)] z-50'
              : 'shadow-[0_1px_2px_rgba(26,29,26,0.04),0_1px_3px_rgba(26,29,26,0.06)]'
          }`}
          style={{
            ...provided.draggableProps.style,
            borderLeft: `3px solid ${columnMeta[task.status]?.color ?? '#A3AC9E'}`,
            background: '#fff',
            borderRadius: '12px',
            opacity: snapshot.isDragging ? 0.95 : 1,
          }}
        >
          {/* Drag handle bar — visible on hover */}
          <div
            {...provided.dragHandleProps}
            className="flex items-center gap-1.5 px-3 pt-2 pb-0.5 cursor-grab active:cursor-grabbing select-none"
          >
            <GripVertical className="h-3 w-3 text-[#D8DCD6] transition-colors group-hover/handle:text-text-tertiary" />
            <p className="text-sm font-medium text-text-primary flex-1 truncate min-w-0">
              {task.title}
            </p>
          </div>

          <div className="px-3 pb-2">
            {task.description && (
              <p className="text-xs text-text-tertiary line-clamp-2 mt-1.5 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Subtasks count */}
            {task.subtasks && task.subtasks.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleExpand?.() }}
                className="mt-2 flex items-center gap-1 text-[10px] text-accent-600 hover:text-accent-500 font-medium transition-colors cursor-pointer"
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Subscript className="h-3 w-3" />
                {task.subtasks.length} subtask{task.subtasks.length > 1 ? 's' : ''}
              </button>
            )}

            {/* Subtask list (expanded) */}
            {expanded && task.subtasks && task.subtasks.length > 0 && (
              <div className="mt-2 space-y-1 pl-2 border-l-2 border-accent-200">
                {task.subtasks.map((st: any) => (
                  <div key={st.id} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
                    <span className={`h-1.5 w-1.5 rounded-full ${st.status === 'DONE' ? 'bg-pos' : 'bg-accent-300'}`} />
                    <span className={st.status === 'DONE' ? 'line-through text-text-tertiary' : ''}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Dependencies */}
            {task.dependencies && task.dependencies.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {task.dependencies.map((dep: any) => (
                  <div key={dep.id} className="flex items-center gap-1 text-[9px] text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
                    <span className="font-medium">Blocks:</span> {dep.depends_on_title || `#${dep.depends_on}`}
                    {dep.depends_on_status === 'DONE' ? ' ✅' : ` (${dep.depends_on_status})`}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {task.priority && <PriorityBadge priority={task.priority} />}
              {task.assignee_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
                  <User className="h-2.5 w-2.5" />
                  {task.assignee_name}
                </span>
              )}

              {/* Comment toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowComments(!showComments) }}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-text-tertiary hover:text-accent-600 hover:bg-accent-50 transition-all cursor-pointer"
              >
                <MessageSquare className="h-2.5 w-2.5" />
                Comments
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
                className="ml-auto p-1 text-[#D8DCD6] hover:text-neg transition-colors cursor-pointer rounded-md hover:bg-neg-bg"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {/* Comment section (inline) */}
            {showComments && (
              <div className="mt-2">
                <CommentSection resourceType="TASK" resourceId={task.id.toString()} compact />
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}

/* ─── Column ─── */

function TaskColumn({
  column,
  tasks,
  isLoading,
  search,
  onDelete,
  expandedTasks,
  onToggleExpand,
}: {
  column: string
  tasks: any[]
  isLoading: boolean
  search: string
  onDelete: (id: string) => void
  expandedTasks: Set<string>
  onToggleExpand: (id: string) => void
}) {
  const meta = columnMeta[column]
  const filtered = tasks.filter(
    (t: any) =>
      t.status === column &&
      (!search || t.title.toLowerCase().includes(search.toLowerCase())),
  )
  const isEmpty = !isLoading && filtered.length === 0

  return (
    <div className="flex flex-col min-h-0 rounded-xl snap-start shrink-0 w-[85vw] md:w-auto md:min-w-[280px] md:flex-1" style={{ background: 'transparent' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {meta.label}
          </h3>
        </div>
        {!isLoading && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
            style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
          >
            {filtered.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <Droppable droppableId={column}>
          {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex flex-col flex-1 min-h-0 gap-2 rounded-xl transition-all duration-200 px-1 py-0.5 ${
                snapshot.isDraggingOver ? `${meta.bg} ring-1 ring-black/[0.04]` : ''
              }`}
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#D8DCD6 transparent',
              }}
            >
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${meta.color}10` }}>
                    <AlertCircle className="h-3.5 w-3.5" style={{ color: meta.color }} />
                  </div>
                  <p className="text-xs text-text-tertiary mt-2">No tasks</p>
                </div>
              ) : (
                filtered.map((task: any, i: number) => (
                  <TaskCard key={task.id} task={task} index={i} onDelete={(id) => onDelete(id)}
                    expanded={expandedTasks.has(task.id.toString())}
                    onToggleExpand={() => onToggleExpand(task.id.toString())}
                  />
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  )
}

/* ─── Page ─── */

export default function TasksPage() {
  const queryClient = useQueryClient()
  const { data: rawTasks, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  })

  // Stable sort: position first, then id as tiebreaker — prevents shuffle on refetch
  const tasks = (rawTasks ?? []).slice().sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id)
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.searchUsers(),
  })

  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('MEDIUM')
  const [newAssignee, setNewAssignee] = useState('')
  const [newParent, setNewParent] = useState('')
  const [showAssigneeSearch, setShowAssigneeSearch] = useState(false)
  const [showParentSearch, setShowParentSearch] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [parentSearch, setParentSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [taskSearch, setTaskSearch] = useState('')
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  // Optimistic local state for instant drag feedback (cleaned up after refetch)
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({})
  const [optimisticPosition, setOptimisticPosition] = useState<Record<string, number>>({})

  // Merge optimistic overrides into server data
  const displayTasks = tasks.map((t: any) => ({
    ...t,
    ...(optimisticStatus[t.id] ? { status: optimisticStatus[t.id] } : {}),
    ...(optimisticPosition[t.id] !== undefined ? { position: optimisticPosition[t.id] } : {}),
  }))

  const { toast } = useToast()

  const createTask = useMutation({
    mutationFn: () =>
      api.createTask({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
        assignee: newAssignee || undefined,
        parent: newParent || undefined,
      }),
    onSuccess: () => {
      setNewTitle('')
      setNewDesc('')
      setNewPriority('MEDIUM')
      setNewAssignee('')
      setNewParent('')
      setShowNew(false)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast('Task created')
    },
    onError: (err: any) => {
      toast(err?.message || 'Failed to create task', 'error')
    },
  })

  const deleteTask = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast('Task deleted')
    },
  })

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, source, destination } = result
    if (destination.droppableId === source.droppableId && source.index === destination.index) return

    // Optimistic update: instantly move the card so @hello-pangea/dnd's
    // drop animation plays to the correct final position
    setOptimisticPosition((prev) => ({ ...prev, [draggableId]: destination.index }))
    if (destination.droppableId !== source.droppableId) {
      setOptimisticStatus((prev) => ({ ...prev, [draggableId]: destination.droppableId }))
    }

    const body = {
      position: destination.index,
      ...(destination.droppableId !== source.droppableId
        ? { status: destination.droppableId }
        : {}),
    }

    api.updateTask(draggableId, body)
      .then(() => {
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ['tasks'] }), 200)
      })
      .catch(() => {
        // Roll back on failure
        setOptimisticStatus((prev) => { const { [draggableId]: _, ...rest } = prev; return rest })
        setOptimisticPosition((prev) => { const { [draggableId]: _, ...rest } = prev; return rest })
      })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    createTask.mutate()
  }

  const filteredUsers = (users ?? []).filter(
    (u: any) =>
      !assigneeSearch ||
      u.name?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(assigneeSearch.toLowerCase()),
  )

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm font-medium text-red-800">Failed to load tasks</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full flex flex-col gap-2">
      {/* ── Heading ── */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-sm font-bold text-text-primary tracking-tight">Tasks</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Drag tasks between columns to update status</p>
        </div>
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" />
          {showNew ? 'Cancel' : 'New Task'}
        </Button>
      </div>

      {/* ── New task form ── */}
      {showNew && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  required
                  autoFocus
                  className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Add details..."
                  rows={2}
                  className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-white"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Assign to</label>
                  <div className="relative">
                    <div
                      onClick={() => setShowAssigneeSearch(true)}
                      className="flex h-[38px] cursor-pointer items-center rounded-lg border border-border-subtle px-3 text-sm text-text-secondary hover:border-gray-400 bg-white"
                    >
                      {newAssignee
                        ? users?.find((u: any) => u.id === newAssignee)?.name ?? 'Unknown'
                        : 'Myself'}
                    </div>
                    {showAssigneeSearch && (
                      <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-border-subtle bg-white p-2 shadow-card">
                        <input
                          type="text"
                          value={assigneeSearch}
                          onChange={(e) => setAssigneeSearch(e.target.value)}
                          placeholder="Search users..."
                          autoFocus
                          className="mb-2 w-full rounded-md border border-border-subtle px-2 py-1.5 text-xs focus:border-accent-500 focus:outline-none"
                        />
                        <div className="max-h-32 space-y-0.5 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setNewAssignee('')
                              setShowAssigneeSearch(false)
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-secondary hover:bg-gray-50"
                          >
                            <User className="h-3 w-3" />
                            Myself
                          </button>
                          {filteredUsers.map((u: any) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setNewAssignee(u.id)
                                setShowAssigneeSearch(false)
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-secondary hover:bg-gray-50"
                            >
                              <User className="h-3 w-3" />
                              {u.name ?? u.email}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Parent task (optional)</label>
                <div className="relative">
                  <div
                    onClick={() => setShowParentSearch(true)}
                    className="flex h-[38px] cursor-pointer items-center rounded-lg border border-border-subtle px-3 text-sm text-text-secondary hover:border-gray-400 bg-white"
                  >
                    {newParent
                      ? tasks.find((t: any) => t.id.toString() === newParent)?.title ?? 'Unknown'
                      : 'None (top-level task)'}
                  </div>
                  {showParentSearch && (
                    <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-border-subtle bg-white p-2 shadow-card max-h-48">
                      <input
                        type="text"
                        value={parentSearch}
                        onChange={(e) => setParentSearch(e.target.value)}
                        placeholder="Search tasks..."
                        autoFocus
                        className="mb-2 w-full rounded-md border border-border-subtle px-2 py-1.5 text-xs focus:border-accent-500 focus:outline-none"
                      />
                      <div className="max-h-32 space-y-0.5 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setNewParent('')
                            setShowParentSearch(false)
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-secondary hover:bg-gray-50"
                        >
                          None (top-level task)
                        </button>
                        {tasks
                          .filter((t: any) => !t.parent && (!parentSearch || t.title.toLowerCase().includes(parentSearch.toLowerCase())))
                          .map((t: any) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setNewParent(t.id.toString())
                                setShowParentSearch(false)
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-secondary hover:bg-gray-50"
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${t.status === 'DONE' ? 'bg-pos' : 'bg-accent-300'}`} />
                              {t.title}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create task'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Search ── */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <input
          value={taskSearch}
          onChange={(e) => setTaskSearch(e.target.value)}
          placeholder="Search tasks..."
          className="block w-full rounded-lg border border-border-subtle pl-9 pr-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-white"
        />
      </div>

      {/* ── Kanban board ── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex md:grid md:grid-cols-4 gap-3 flex-1 min-h-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory" style={{ gridAutoRows: '1fr' }}>
          {columns.map((column) => (
            <TaskColumn
              key={column}
              column={column}
              tasks={displayTasks}
              isLoading={isLoading}
              search={taskSearch}
              onDelete={setConfirmDeleteId}
              expandedTasks={expandedTasks}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      </DragDropContext>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete task?"
        message="Are you sure you want to delete this task? This cannot be undone."
        onConfirm={() => {
          if (confirmDeleteId) deleteTask.mutate(confirmDeleteId)
          setConfirmDeleteId(null)
        }}
        onCancel={() => setConfirmDeleteId(null)}
        loading={deleteTask.isPending}
      />
    </div>
  )
}
