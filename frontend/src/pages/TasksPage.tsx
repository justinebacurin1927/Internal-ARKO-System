import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import { Button } from '../components/Button'
import { Plus, AlertCircle, User, Search, X } from 'lucide-react'

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
  const [searchAssignee, setSearchAssignee] = useState('')
  const [showAssigneeOverlay, setShowAssigneeOverlay] = useState(false)

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

  const filteredUsers = users?.filter((u: any) =>
    !searchAssignee || (u.name ?? u.email).toLowerCase().includes(searchAssignee.toLowerCase())
  )

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4" />
        Failed to load tasks
      </div>
    )
  }

  const selectedUser = users?.find((u: any) => u.id === newAssignee)

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
        <Card className="overflow-hidden">
          <CardContent className="p-5 space-y-4">
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
                placeholder="Optional details..."
                rows={2}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
              />
            </div>
            <div className="flex gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Assignee</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAssigneeOverlay(!showAssigneeOverlay)}
                    className="flex items-center gap-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-left bg-white hover:border-gray-400 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    <span className={selectedUser ? 'text-gray-900' : 'text-gray-400'}>
                      {selectedUser ? (selectedUser.name || selectedUser.email) : 'Assign to me'}
                    </span>
                  </button>
                  {showAssigneeOverlay && (
                    <div className="absolute top-full left-0 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl z-10">
                      <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <input
                            value={searchAssignee}
                            onChange={(e) => setSearchAssignee(e.target.value)}
                            placeholder="Search..."
                            className="w-full rounded-md border border-gray-200 pl-7 pr-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                          />
                        </div>
                      </div>
                      <div className="max-h-32 overflow-y-auto p-1">
                        <button
                          type="button"
                          onClick={() => { setNewAssignee(''); setShowAssigneeOverlay(false); setSearchAssignee('') }}
                          className="w-full px-3 py-1.5 text-xs text-left rounded hover:bg-gray-50 text-gray-700"
                        >
                          Assign to me
                        </button>
                        {filteredUsers?.map((u: any) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => { setNewAssignee(u.id); setShowAssigneeOverlay(false); setSearchAssignee('') }}
                            className="w-full px-3 py-1.5 text-xs text-left rounded hover:bg-gray-50 text-gray-700"
                          >
                            {u.name || u.email}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => createTask.mutate()}
                disabled={!newTitle.trim() || createTask.isPending}
              >
                {createTask.isPending ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="ghost" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban columns */}
      {isLoading ? (
        <div className="text-sm text-gray-400">Loading tasks...</div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {columns.map((status) => {
            const colTasks = tasks?.filter((t: any) => t.status === status) ?? []
            return (
              <div key={status} className="flex flex-col gap-3">
                <Card
                  className="overflow-hidden cursor-default"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const taskId = e.dataTransfer.getData('taskId')
                    if (taskId) handleDrop(taskId, status)
                  }}
                >
                  <CardHeader className="px-3 pt-3 pb-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        {columnLabels[status]}
                      </CardTitle>
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                        {colTasks.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-2 space-y-2">
                    {colTasks.length === 0 && (
                      <div className="border-2 border-dashed border-gray-200 rounded-lg py-6 flex items-center justify-center">
                        <p className="text-[10px] text-gray-400">No tasks</p>
                      </div>
                    )}
                    {colTasks.map((task: any) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className="rounded-lg border border-gray-200 bg-white p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-xs font-medium text-gray-900 leading-snug">{task.title}</p>
                        </div>
                        {task.description && (
                          <p className="text-[10px] text-gray-500 mb-2 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase ${
                            task.priority === 'URGENT'
                              ? 'bg-red-50 text-red-700'
                              : task.priority === 'HIGH'
                              ? 'bg-orange-50 text-orange-700'
                              : task.priority === 'MEDIUM'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-50 text-gray-600'
                          }`}>
                            {task.priority}
                          </span>
                          {task.assignee_name && (
                            <span className="flex items-center gap-1 text-[9px] text-gray-400">
                              <User className="h-3 w-3" />
                              {task.assignee_name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
