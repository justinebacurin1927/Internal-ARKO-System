import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import SubtaskList from './SubtaskList'
import DependencyPicker from './DependencyPicker'
import CommentThread from './CommentThread'
import FilePicker from './FilePicker'
import FileList from './FileList'
import {
  X, MessageSquare, ListTodo, Link2, Paperclip,
  Calendar, User, Loader2,
} from 'lucide-react'

interface TaskDetailDrawerProps {
  open: boolean
  taskId: string | null
  onClose: () => void
}

type Tab = 'subtasks' | 'dependencies' | 'comments' | 'attachments'

export default function TaskDetailDrawer({ open, taskId, onClose }: TaskDetailDrawerProps) {
  const [tab, setTab] = useState<Tab>('subtasks')
  const [showDeps, setShowDeps] = useState(false)
  const queryClient = useQueryClient()

  const { data: task, isLoading } = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: () => api.getTask(taskId!),
    enabled: !!taskId,
  })

  // Reset tab when task changes
  useEffect(() => { if (taskId) setTab('subtasks') }, [taskId])

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateTask(taskId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] })
    },
  })

  if (!taskId || !open) return null

  const priorityStyles: Record<string, string> = {
    URGENT: 'bg-neg-bg text-neg',
    HIGH: 'bg-warn-bg text-warn',
    MEDIUM: 'bg-accent-50 text-accent-700',
    LOW: 'bg-gray-50 text-gray-500',
  }

  const tabs: Array<{ key: Tab; label: string; icon: any; count?: number }> = [
    { key: 'subtasks', label: 'Subtasks', icon: ListTodo, count: task?.subtask_progress ? 1 : 0 },
    { key: 'dependencies', label: 'Deps', icon: Link2, count: task?.depends_on_detail?.length || 0 },
    { key: 'comments', label: 'Comments', icon: MessageSquare, count: task?.comment_count || 0 },
    { key: 'attachments', label: 'Files', icon: Paperclip },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border-subtle bg-bg-app shadow-lg animate-slide-up overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 border-b border-border-subtle bg-white px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5">
              {task?.priority && (
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${priorityStyles[task.priority] ?? ''}`}>
                  {task.priority}
                </span>
              )}
              <select
                value={task?.status || 'TODO'}
                onChange={(e) => updateMutation.mutate({ status: e.target.value })}
                className="rounded-lg border border-border-subtle bg-white px-2 py-0.5 text-[10px] font-medium outline-none focus:border-accent-500 cursor-pointer"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
              <span className="text-xs text-text-tertiary">Loading…</span>
            </div>
          ) : task ? (
            <>
              <h2 className="text-sm font-semibold text-text-primary">{task.title}</h2>
              {task.description && (
                <p className="mt-1 text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{task.description}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-[10px] text-text-tertiary">
                {task.assignee_name && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {task.assignee_name}
                  </span>
                )}
                {task.due_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-text-tertiary py-2">Task not found</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-border-subtle bg-white px-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[10px] font-medium transition-colors cursor-pointer ${
                tab === t.key
                  ? 'border-accent-500 text-accent-500'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
              {(t.count ?? 0) > 0 && (
                <span className="rounded-full bg-accent-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent-500">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin' }}>
          {tab === 'subtasks' && (
            <SubtaskList
              parentId={taskId!}
              subtasks={task?.subtasks || []}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] })}
            />
          )}

          {tab === 'dependencies' && (
            <>
              {/* Current dependencies */}
              {task?.depends_on_detail?.length > 0 && (
                <div className="mb-2 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">Depends on</p>
                  {task.depends_on_detail.map((d: any) => (
                    <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-2.5 py-1.5">
                      <span className={`h-2 w-2 rounded-full ${
                        d.status === 'DONE' ? 'bg-pos' : d.status === 'IN_PROGRESS' ? 'bg-warn' : 'bg-gray-300'
                      }`} />
                      <span className="text-xs text-text-primary flex-1 min-w-0 truncate">{d.title}</span>
                      <span className="text-[10px] text-text-tertiary">{d.status}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowDeps(true)}
                className="w-full rounded-lg border border-dashed border-border-subtle px-3 py-2 text-xs text-text-tertiary hover:border-accent-300 hover:text-accent-500 transition-colors cursor-pointer"
              >
                <Link2 className="h-3 w-3 inline mr-1" />
                Manage dependencies
              </button>

              <DependencyPicker
                currentTaskId={taskId!}
                selected={task?.depends_on_detail || []}
                onSave={(ids) => updateMutation.mutate({ depends_on: ids })}
                open={showDeps}
                onClose={() => setShowDeps(false)}
              />
            </>
          )}

          {tab === 'comments' && (
            <CommentThread
              taskId={taskId!}
              onCommentAdded={() => queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] })}
            />
          )}

          {tab === 'attachments' && (
            <>
              <FilePicker objectType="task" objectId={taskId} />
              <div className="mt-2">
                <FileList objectType="task" objectId={taskId} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
