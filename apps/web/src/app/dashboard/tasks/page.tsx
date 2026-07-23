'use client'

import { useState } from 'react'
import { Card, CardContent, Button } from '@arko/ui'
import {
  Plus,
  ListTodo,
  AlertCircle,
  User,
  Loader2,
  X,
  Trash2,
  Ban,
  CornerDownRight,
} from 'lucide-react'
import { api } from '../../../lib/trpc/client'
import { CommentThread } from './comment-thread'
import { FileUploader } from '../../../components/file-uploader'
import { AttachmentList } from '../../../components/attachment-list'

// resourceType key for the generic comments system (see comments router)
const TASK_RESOURCE = 'TASK'

const columns = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const
const columnLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
}
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

// dependsOn = blockers of this task that are not yet DONE
const blockers = (task: any) =>
  (task.blockedBy ?? []).map((d: any) => d.blocking).filter(Boolean)
const isBlocked = (task: any) =>
  blockers(task).some((b: any) => b.status !== 'DONE')

export default function TasksPage() {
  const { data: tasks, isLoading, error } = api.tasks.list.useQuery()
  const { data: users } = api.users.search.useQuery({})
  const utils = api.useUtils()

  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('MEDIUM')
  const [newAssignee, setNewAssignee] = useState('')
  const [showAssigneeSearch, setShowAssigneeSearch] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Derive from the live list so the drawer reflects fresh data after invalidation
  const selected = tasks?.find((t) => t.id === selectedId) ?? null

  // Inline, dismissible notice (replaces native alert()) — matches the dashboard's
  // inline error-card convention rather than browser dialogs.
  const [notice, setNotice] = useState<string | null>(null)

  const createTask = api.tasks.create.useMutation({
    onSuccess: () => {
      setNewTitle('')
      setNewDesc('')
      setNewPriority('MEDIUM')
      setNewAssignee('')
      setShowNew(false)
      utils.tasks.list.invalidate()
    },
  })

  const updateStatus = api.tasks.updateStatus.useMutation({
    onError: (e) => setNotice(e.message),
    onSuccess: () => utils.tasks.list.invalidate(),
  })

  const assignTask = api.tasks.assignTask.useMutation({
    onSuccess: () => utils.tasks.list.invalidate(),
  })

  const updateTask = api.tasks.update.useMutation({
    onError: (e) => setNotice(e.message),
    onSuccess: () => utils.tasks.list.invalidate(),
  })
  const deleteTask = api.tasks.delete.useMutation({
    onError: (e) => setNotice(e.message),
    onSuccess: () => {
      setSelectedId(null)
      utils.tasks.list.invalidate()
    },
  })
  const createSubtask = api.tasks.create.useMutation({
    onError: (e) => setNotice(e.message),
    onSuccess: () => utils.tasks.list.invalidate(),
  })
  const addDependency = api.tasks.addDependency.useMutation({
    onError: (e) => setNotice(e.message),
    onSuccess: () => utils.tasks.list.invalidate(),
  })
  const removeDependency = api.tasks.removeDependency.useMutation({
    onSuccess: () => utils.tasks.list.invalidate(),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    createTask.mutate({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      priority: newPriority as (typeof priorities)[number],
      assigneeId: newAssignee || undefined,
    })
  }

  const handleDrop = (taskId: string, newStatus: string) => {
    // Blocked-task guard: cannot move a blocked task into DONE
    const task = tasks?.find((t) => t.id === taskId)
    if (newStatus === 'DONE' && task && isBlocked(task)) {
      setNotice('This task is blocked by an incomplete task and cannot be moved to Done.')
      return
    }
    updateStatus.mutate({ id: taskId, status: newStatus as any })
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your tasks and projects</p>
        </div>
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" />
          {showNew ? 'Cancel' : 'New Task'}
        </Button>
      </div>

      {/* New task form */}
      {showNew && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  required
                  autoFocus
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Add details..."
                  rows={2}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Assign to
                  </label>
                  <div className="relative">
                    <div
                      onClick={() => setShowAssigneeSearch(true)}
                      className="flex h-[38px] cursor-pointer items-center rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:border-gray-400"
                    >
                      {newAssignee
                        ? users?.find((u) => u.id === newAssignee)?.name ?? 'Unknown'
                        : 'Myself'}
                    </div>
                    {showAssigneeSearch && (
                      <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                        <input
                          type="text"
                          value={assigneeSearch}
                          onChange={(e) => setAssigneeSearch(e.target.value)}
                          placeholder="Search users..."
                          autoFocus
                          className="mb-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                        />
                        <div className="max-h-32 space-y-0.5 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setNewAssignee('')
                              setShowAssigneeSearch(false)
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            <User className="h-3 w-3" />
                            Myself
                          </button>
                          {(users ?? [])
                            .filter(
                              (u) =>
                                !assigneeSearch ||
                                u.name?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                                u.email.toLowerCase().includes(assigneeSearch.toLowerCase()),
                            )
                            .map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setNewAssignee(u.id)
                                  setShowAssigneeSearch(false)
                                }}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
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
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

      {notice && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {notice}
            </div>
            <button
              onClick={() => setNotice(null)}
              className="rounded p-1 text-amber-500 hover:bg-amber-100"
            >
              <X className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      )}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-medium text-red-800">Failed to load tasks</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {columns.map((column) => {
            const colTasks = tasks?.filter((t) => t.status === column && !t.parentId) ?? []
            const isEmpty = !isLoading && colTasks.length === 0

            return (
              <div
                key={column}
                className="space-y-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const taskId = e.dataTransfer.getData('taskId')
                  if (taskId) handleDrop(taskId, column)
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {columnLabels[column]}
                  </h3>
                  {!isLoading && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                      {colTasks.length}
                    </span>
                  )}
                </div>

                {isLoading ? (
                  <Card aria-hidden="true">
                    <CardContent className="space-y-3 py-6">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : isEmpty ? (
                  <Card className="border-dashed border-gray-200">
                    <CardContent>
                      <div className="flex flex-col items-center py-8 text-gray-300">
                        <ListTodo className="mb-2 h-7 w-7" />
                        <p className="text-xs">No tasks</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {colTasks.map((task) => {
                      const subs = task.subtasks ?? []
                      const doneSubs = subs.filter((s: any) => s.status === 'DONE').length
                      const blocked = isBlocked(task)
                      return (
                        <Card
                          key={task.id}
                          className="cursor-pointer"
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => setSelectedId(task.id)}
                        >
                          <CardContent className="p-4">
                            <p className="text-sm font-medium text-gray-900">{task.title}</p>
                            {task.description && (
                              <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {task.priority && (
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                    task.priority === 'URGENT'
                                      ? 'bg-red-50 text-red-700'
                                      : task.priority === 'HIGH'
                                        ? 'bg-orange-50 text-orange-700'
                                        : task.priority === 'MEDIUM'
                                          ? 'bg-primary-50 text-primary-700'
                                          : 'bg-gray-50 text-gray-600'
                                  }`}
                                >
                                  {task.priority}
                                </span>
                              )}
                              {task.assignee && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
                                  <User className="h-2.5 w-2.5" />
                                  {task.assignee.name ?? task.assignee.email}
                                </span>
                              )}
                              {subs.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
                                  <CornerDownRight className="h-2.5 w-2.5" />
                                  {doneSubs}/{subs.length}
                                </span>
                              )}
                              {blocked && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                                  <Ban className="h-2.5 w-2.5" />
                                  Blocked
                                </span>
                              )}
                              {/* Comment-count badge intentionally deferred: Comment has no FK
                                  to Task (generic resourceType/resourceId), so a per-card count
                                  needs a batched count proc — out of scope for this story. */}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <TaskDetail
          task={selected}
          allTasks={tasks ?? []}
          onClose={() => setSelectedId(null)}
          onError={setNotice}
          updateTask={updateTask}
          updateStatus={updateStatus}
          deleteTask={deleteTask}
          createSubtask={createSubtask}
          addDependency={addDependency}
          removeDependency={removeDependency}
        />
      )}
    </div>
  )
}

function TaskDetail({
  task,
  allTasks,
  onClose,
  onError,
  updateTask,
  updateStatus,
  deleteTask,
  createSubtask,
  addDependency,
  removeDependency,
}: any) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState(task.priority)
  const [status, setStatus] = useState(task.status)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [depSearch, setDepSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [attachRefresh, setAttachRefresh] = useState(0)

  const subs = task.subtasks ?? []
  const deps = (task.blockedBy ?? []).map((d: any) => d.blocking).filter(Boolean)
  const depIds = new Set(deps.map((d: any) => d.id))

  const saveEdits = () => {
    updateTask.mutate({
      id: task.id,
      title: title.trim() || task.title,
      description,
      priority,
      status,
    })
  }

  // Candidate blockers: any top-level task except self and existing deps
  const candidates = allTasks.filter(
    (t: any) =>
      t.id !== task.id &&
      !depIds.has(t.id) &&
      (!depSearch || t.title.toLowerCase().includes(depSearch.toLowerCase())),
  )

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Task details</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                {columns.map((s) => (
                  <option key={s} value={s}>
                    {columnLabels[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={saveEdits} disabled={updateTask.isPending}>
            {updateTask.isPending ? 'Saving...' : 'Save changes'}
          </Button>

          {/* Subtasks */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Subtasks ({subs.filter((s: any) => s.status === 'DONE').length}/{subs.length})
            </h3>
            <div className="space-y-1.5">
              {subs.map((s: any) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={s.status === 'DONE'}
                    disabled={updateStatus.isPending}
                    onChange={() =>
                      updateStatus.mutate({
                        id: s.id,
                        status: s.status === 'DONE' ? 'TODO' : 'DONE',
                      })
                    }
                    className="h-3.5 w-3.5 rounded border-gray-300"
                  />
                  <span className={s.status === 'DONE' ? 'line-through text-gray-400' : ''}>
                    {s.title}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="Add a subtask..."
                className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
              />
              <Button
                onClick={() => {
                  if (!subtaskTitle.trim()) return
                  createSubtask.mutate({ title: subtaskTitle.trim(), parentId: task.id })
                  setSubtaskTitle('')
                }}
                disabled={createSubtask.isPending}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Dependencies */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Blocked by</h3>
            <div className="space-y-1.5">
              {deps.length === 0 && <p className="text-xs text-gray-400">No dependencies</p>}
              {deps.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 px-2.5 py-1.5 text-xs"
                >
                  <span className="flex items-center gap-1.5 text-gray-700">
                    <Ban
                      className={`h-3 w-3 ${d.status === 'DONE' ? 'text-gray-300' : 'text-red-500'}`}
                    />
                    {d.title}
                  </span>
                  <button
                    onClick={() => removeDependency.mutate({ taskId: task.id, blockerId: d.id })}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <input
              value={depSearch}
              onChange={(e) => setDepSearch(e.target.value)}
              placeholder="Add a blocker..."
              className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
            />
            {depSearch && (
              <div className="mt-1 max-h-32 space-y-0.5 overflow-y-auto rounded-md border border-gray-100 p-1">
                {candidates.slice(0, 6).map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      addDependency.mutate({ taskId: task.id, blockerId: t.id })
                      setDepSearch('')
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {t.title}
                  </button>
                ))}
                {candidates.length === 0 && (
                  <p className="px-2 py-1 text-xs text-gray-400">No matching tasks</p>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <CommentThread resourceType={TASK_RESOURCE} resourceId={task.id} onError={onError} />

          {/* Attachments */}
          <div className="border-t border-gray-100 pt-4">
            <AttachmentList key={attachRefresh} resourceType={TASK_RESOURCE} resourceId={task.id} />
            <div className="mt-2">
              <FileUploader
                resourceType={TASK_RESOURCE}
                resourceId={task.id}
                onUploadComplete={() => setAttachRefresh((n) => n + 1)}
              />
            </div>
          </div>

          {/* Delete — two-step inline confirm (no native dialog) */}
          <div className="border-t border-gray-100 pt-4">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Delete this task? Subtasks are promoted to top-level.
                </span>
                <button
                  onClick={() => deleteTask.mutate({ id: task.id })}
                  disabled={deleteTask.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteTask.isPending ? 'Deleting...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete task
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
