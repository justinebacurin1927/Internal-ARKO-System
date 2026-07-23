'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@arko/ui'
import { Plus, Workflow, AlertCircle, Play, History, Loader2, X, Pencil, Trash2 } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

const SAMPLE_DEFINITION = JSON.stringify(
  {
    steps: [
      { name: 'Notify', action: 'log', message: 'Workflow started' },
      { name: 'Process', action: 'noop' },
      { name: 'Finish', action: 'log', message: 'Done' },
    ],
  },
  null,
  2,
)

const statusColor: Record<string, string> = {
  COMPLETED: 'bg-green-50 text-green-700',
  RUNNING: 'bg-blue-50 text-blue-700',
  PENDING: 'bg-gray-50 text-gray-600',
  FAILED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-50 text-gray-500',
}

export default function WorkflowsPage() {
  const { data: workflows, isLoading, error } = api.workflows.list.useQuery()
  const utils = api.useUtils()

  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [definition, setDefinition] = useState(SAMPLE_DEFINITION)
  const [notice, setNotice] = useState<string | null>(null)

  const createWf = api.workflows.create.useMutation({
    onError: (e) => setNotice(e.message),
    onSuccess: () => {
      setName('')
      setDescription('')
      setDefinition(SAMPLE_DEFINITION)
      setShowNew(false)
      utils.workflows.list.invalidate()
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createWf.mutate({ name: name.trim(), description: description.trim() || undefined, definition })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Workflows</h1>
          <p className="text-sm text-gray-500 mt-1">Automate your business processes</p>
        </div>
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4" />
          {showNew ? 'Cancel' : 'New Workflow'}
        </Button>
      </div>

      {notice && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {notice}
            </div>
            <button onClick={() => setNotice(null)} className="rounded p-1 text-amber-500 hover:bg-amber-100">
              <X className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      )}

      {showNew && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Workflow name"
                  required
                  autoFocus
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Definition (JSON — steps of action <code>log</code> or <code>noop</code>)
                </label>
                <textarea
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <Button type="submit" disabled={createWf.isPending}>
                {createWf.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create workflow'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-medium text-red-800">Failed to load workflows</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-5 w-32 rounded bg-gray-100 animate-pulse mt-3" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflows && workflows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {workflows.map((wf) => (
            <WorkflowCard key={wf.id} wf={wf} onError={setNotice} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-gray-200">
          <CardContent>
            <div className="flex flex-col items-center py-12 text-gray-400">
              <Workflow className="mb-2 h-8 w-8" />
              <p className="text-sm">No workflows yet</p>
              <button
                onClick={() => setShowNew(true)}
                className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Create your first workflow
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function WorkflowCard({ wf, onError }: { wf: any; onError: (m: string) => void }) {
  const utils = api.useUtils()
  const [showHistory, setShowHistory] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(wf.name)
  const [description, setDescription] = useState(wf.description ?? '')
  const [definition, setDefinition] = useState(wf.definition)

  const runWf = api.workflows.execute.useMutation({
    onError: (e) => onError(e.message),
    onSuccess: () => {
      setShowHistory(true)
      utils.workflows.listExecutions.invalidate({ workflowId: wf.id })
    },
  })
  const updateWf = api.workflows.update.useMutation({
    onError: (e) => onError(e.message),
    onSuccess: () => {
      setEditing(false)
      utils.workflows.list.invalidate()
    },
  })
  const deleteWf = api.workflows.delete.useMutation({
    onError: (e) => onError(e.message),
    onSuccess: () => utils.workflows.list.invalidate(),
  })

  if (editing) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            rows={6}
            spellCheck={false}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs focus:border-primary-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <Button
              onClick={() =>
                updateWf.mutate({ id: wf.id, name: name.trim() || wf.name, description, definition })
              }
              disabled={updateWf.isPending}
            >
              {updateWf.isPending ? 'Saving...' : 'Save'}
            </Button>
            <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-workflow-50">
            <Workflow className="h-5 w-5 text-workflow-600" />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setEditing(true)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Edit workflow"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
              aria-label="Delete workflow"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <CardTitle className="text-base mt-2">{wf.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {wf.description && <p className="text-sm text-gray-500">{wf.description}</p>}
        <span
          className={`mt-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            wf.status === 'ACTIVE'
              ? 'bg-green-50 text-green-700'
              : wf.status === 'PAUSED'
                ? 'bg-workflow-50 text-workflow-700'
                : 'bg-gray-50 text-gray-600'
          }`}
        >
          {wf.status}
        </span>

        {confirmDelete ? (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-gray-600">Delete this workflow?</span>
            <button
              onClick={() => deleteWf.mutate({ id: wf.id })}
              disabled={deleteWf.isPending}
              className="rounded-md bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleteWf.isPending ? 'Deleting...' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={() => runWf.mutate({ workflowId: wf.id })} disabled={runWf.isPending}>
              {runWf.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run
            </Button>
            <button
              onClick={() => setShowHistory((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
            >
              <History className="h-4 w-4" />
              Runs
            </button>
          </div>
        )}

        {showHistory && <ExecutionHistory workflowId={wf.id} />}
      </CardContent>
    </Card>
  )
}

function ExecutionHistory({ workflowId }: { workflowId: string }) {
  const { data: runs, isLoading } = api.workflows.listExecutions.useQuery({ workflowId })
  const [openId, setOpenId] = useState<string | null>(null)

  if (isLoading) {
    return <p className="mt-3 text-xs text-gray-400">Loading runs…</p>
  }
  if (!runs || runs.length === 0) {
    return <p className="mt-3 text-xs text-gray-400">No runs yet</p>
  }

  return (
    <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
      {runs.map((run: any) => (
        <div key={run.id}>
          <button
            onClick={() => setOpenId(openId === run.id ? null : run.id)}
            className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs hover:bg-gray-50"
          >
            <span className="text-gray-500">
              {new Date(run.createdAt).toLocaleString()}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                statusColor[run.status] ?? 'bg-gray-50 text-gray-600'
              }`}
            >
              {run.status}
            </span>
          </button>
          {openId === run.id && <ExecutionLogs id={run.id} />}
        </div>
      ))}
    </div>
  )
}

function ExecutionLogs({ id }: { id: string }) {
  const { data, isLoading } = api.workflows.getExecution.useQuery({ id })
  if (isLoading) return <p className="px-2 py-1 text-[11px] text-gray-400">Loading logs…</p>
  const logs = data?.logs ?? []
  if (logs.length === 0) return <p className="px-2 py-1 text-[11px] text-gray-400">No logs</p>
  return (
    <div className="ml-2 space-y-0.5 border-l border-gray-100 py-1 pl-2">
      {logs.map((log: any) => (
        <p key={log.id} className="text-[11px] text-gray-600">
          <span
            className={`mr-1.5 font-semibold ${
              log.level === 'ERROR' ? 'text-red-600' : 'text-gray-400'
            }`}
          >
            {log.step}
          </span>
          {log.message}
        </p>
      ))}
    </div>
  )
}
