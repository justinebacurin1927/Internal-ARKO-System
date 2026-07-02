import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent } from '../components/Card'
import { Button } from '../components/Button'
import { Plus, ListTodo, AlertCircle, User, Loader2 } from 'lucide-react'

const columns = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const
const columnLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
}

export default function TasksPage() {
  const queryClient = useQueryClient()
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  })
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.searchUsers(),
  })

  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('MEDIUM')
  const [newAssignee, setNewAssignee] = useState('')
  const [showAssigneeSearch, setShowAssigneeSearch] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')

  const createTask = useMutation({
    mutationFn: () =>
      api.createTask({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
        assignee: newAssignee || undefined,
      }),
    onSuccess: () => {
      setNewTitle('')
      setNewDesc('')
      setNewPriority('MEDIUM')
      setNewAssignee('')
      setShowNew(false)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const handleDrop = (taskId: string, newStatus: string) => {
    updateStatus.mutate({ id: taskId, status: newStatus })
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId)
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
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-start justify-between shrink-0">
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
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Assign to</label>
                  <div className="relative">
                    <div
                      onClick={() => setShowAssigneeSearch(true)}
                      className="flex h-[38px] cursor-pointer items-center rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:border-gray-400"
                    >
                      {newAssignee
                        ? users?.find((u: any) => u.id === newAssignee)?.name ?? 'Unknown'
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
                          {filteredUsers.map((u: any) => (
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

      {/* Kanban columns */}
      <div className="grid grid-cols-4 gap-3 flex-1 min-h-0 grid-rows-1fr">
        {columns.map((column) => {
          const colTasks = tasks?.filter((t: any) => t.status === column) ?? []
          const isEmpty = !isLoading && colTasks.length === 0

          return (
            <div
              key={column}
              className="flex flex-col min-h-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const taskId = e.dataTransfer.getData('taskId')
                if (taskId) handleDrop(taskId, column)
              }}
            >
              <div className="flex items-center justify-between px-1 mb-2 shrink-0">
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
                <Card aria-hidden="true" className="shrink-0">
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
                <div className="flex flex-col flex-1 items-center justify-center">
                  <Card className="border-dashed border-gray-200 w-full">
                    <CardContent>
                      <div className="flex flex-col items-center py-8 text-gray-300">
                        <ListTodo className="mb-2 h-7 w-7" />
                        <p className="text-xs">No tasks</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex flex-col flex-1 overflow-y-auto">
                  <div className="space-y-2">
                    {colTasks.map((task: any) => (
                      <Card
                        key={task.id}
                        className="cursor-grab active:cursor-grabbing select-none"
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
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
                          {task.assignee_name && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
                              <User className="h-2.5 w-2.5" />
                              {task.assignee_name}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}