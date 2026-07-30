'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button, Card, CardContent } from '@arko/ui'
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Circle,
  FileText,
  ListTodo,
  Loader2,
  MessageSquare,
  PackageCheck,
  Plus,
  Send,
  Settings,
} from 'lucide-react'
import { api } from '../../../lib/trpc/client'

const OpenPeepsAvatar = dynamic(
  () => import('../../../components/open-peeps-avatar').then((module) => ({
    default: module.OpenPeepsAvatar,
  })),
  { ssr: false },
)

const quickLinks = [
  {
    href: '/dashboard/messages',
    title: 'Messages',
    description: 'Talk directly with the ARKO team.',
    icon: MessageSquare,
  },
  {
    href: '/dashboard/resources',
    title: 'Shared resources',
    description: 'Open documents and links shared with you.',
    icon: FileText,
  },
  {
    href: '/dashboard/settings',
    title: 'Profile settings',
    description: 'Update your contact details and avatar.',
    icon: Settings,
  },
]

export default function ClientPortalPage() {
  const { data: session } = useSession()
  const isClient = session?.user?.role === 'CLIENT'
  const isAdmin = session?.user?.role === 'ADMIN'
  const [requestTitle, setRequestTitle] = useState('')
  const [requestDescription, setRequestDescription] = useState('')
  const [requestProjectId, setRequestProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectClientId, setProjectClientId] = useState('')
  const [projectSummary, setProjectSummary] = useState('')
  const [projectStartDate, setProjectStartDate] = useState('')
  const [projectDueDate, setProjectDueDate] = useState('')
  const [updateDrafts, setUpdateDrafts] = useState<Record<string, string>>({})
  const [progressDrafts, setProgressDrafts] = useState<Record<string, number>>({})
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({})
  const [deliverableDrafts, setDeliverableDrafts] = useState<Record<string, { title: string; url: string }>>({})
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({})
  const { data: profile, isLoading } = api.users.getProfile.useQuery()
  const { data: unreadMessages } = api.messages.unreadCount.useQuery(undefined, {
    refetchInterval: 10000,
  })
  const { data: resources } = api.resources.list.useQuery({
    page: 1,
    pageSize: 5,
  })
  const { data: projects } = api.clientPortal.dashboard.useQuery()
  const { data: requests } = api.clientPortal.requests.useQuery()
  const { data: users } = api.users.list.useQuery(undefined, { enabled: isAdmin })
  const utils = api.useUtils()
  const clients = users?.filter((user) => user.role === 'CLIENT') ?? []
  const createRequest = api.clientPortal.createRequest.useMutation({
    onSuccess: () => {
      setRequestTitle('')
      setRequestDescription('')
      setRequestProjectId('')
      utils.clientPortal.dashboard.invalidate()
      utils.clientPortal.requests.invalidate()
    },
  })
  const createProject = api.clientPortal.createProject.useMutation({
    onSuccess: () => {
      setProjectName('')
      setProjectClientId('')
      setProjectSummary('')
      setProjectStartDate('')
      setProjectDueDate('')
      utils.clientPortal.dashboard.invalidate()
    },
  })
  const updateProject = api.clientPortal.updateProject.useMutation({
    onSuccess: () => utils.clientPortal.dashboard.invalidate(),
  })
  const updateRequest = api.clientPortal.updateRequest.useMutation({
    onSuccess: () => {
      utils.clientPortal.dashboard.invalidate()
      utils.clientPortal.requests.invalidate()
    },
  })
  const addUpdate = api.clientPortal.addUpdate.useMutation({
    onSuccess: (_, input) => {
      setUpdateDrafts((current) => ({ ...current, [input.projectId]: '' }))
      utils.clientPortal.dashboard.invalidate()
    },
  })
  const addMilestone = api.clientPortal.addMilestone.useMutation({
    onSuccess: (_, input) => {
      setMilestoneDrafts((current) => ({ ...current, [input.projectId]: '' }))
      utils.clientPortal.dashboard.invalidate()
    },
  })
  const setMilestoneCompleted = api.clientPortal.setMilestoneCompleted.useMutation({
    onSuccess: () => utils.clientPortal.dashboard.invalidate(),
  })
  const addDeliverable = api.clientPortal.addDeliverable.useMutation({
    onSuccess: (_, input) => {
      setDeliverableDrafts((current) => ({ ...current, [input.projectId]: { title: '', url: '' } }))
      utils.clientPortal.dashboard.invalidate()
    },
  })
  const reviewDeliverable = api.clientPortal.reviewDeliverable.useMutation({
    onSuccess: () => {
      utils.clientPortal.dashboard.invalidate()
      utils.notifications.unreadCount.invalidate()
    },
  })
  const convertRequest = api.clientPortal.convertRequestToTask.useMutation({
    onSuccess: () => {
      utils.clientPortal.dashboard.invalidate()
      utils.clientPortal.requests.invalidate()
      utils.tasks.list.invalidate()
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border-subtle bg-card">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-500/10">
            <OpenPeepsAvatar
              userId={profile?.id}
              userName={profile?.name ?? undefined}
              avatarJson={profile?.avatar ? JSON.stringify(profile.avatar) : undefined}
              size={56}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-primary-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-400">
                Client Portal
              </span>
            </div>
            <h1 className="truncate text-2xl font-bold tracking-tight text-text-primary">
              Welcome, {profile?.name ?? 'Client'}
            </h1>
            <p className="mt-1 text-sm text-text-tertiary">
              Your secure space for conversations and shared project resources.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Active projects
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-text-primary">
              {projects?.filter((project) => project.status !== 'COMPLETED').length ?? 0}
            </p>
            <p className="mt-4 text-sm text-text-tertiary">Connected to your ARKO project team</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Unread messages
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-text-primary">
              {unreadMessages ?? 0}
            </p>
            <Link
              href="/dashboard/messages"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-400 hover:text-primary-300"
            >
              Open messages <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Shared files
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-text-primary">
              {resources?.total ?? 0}
            </p>
            <Link
              href="/dashboard/resources"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-400 hover:text-primary-300"
            >
              View shared files <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <section className="rounded-2xl border border-border-subtle bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary-400" />
            <h2 className="text-base font-semibold text-text-primary">Connect a client project</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Project name"
              className="rounded-lg border border-border-subtle bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
            />
            <div>
              <label htmlFor="project-start-date" className="mb-1 block text-xs font-medium text-text-secondary">Start date</label>
              <input
                id="project-start-date"
                type="date"
                value={projectStartDate}
                onChange={(event) => setProjectStartDate(event.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="project-due-date" className="mb-1 block text-xs font-medium text-text-secondary">Target completion</label>
              <input
                id="project-due-date"
                type="date"
                value={projectDueDate}
                onChange={(event) => setProjectDueDate(event.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none"
              />
            </div>
            <select
              value={projectClientId}
              onChange={(event) => setProjectClientId(event.target.value)}
              className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name ?? client.email}</option>
              ))}
            </select>
            <input
              value={projectSummary}
              onChange={(event) => setProjectSummary(event.target.value)}
              placeholder="Short project summary"
              className="rounded-lg border border-border-subtle bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
            />
          </div>
          <Button
            size="sm"
            className="mt-3"
            disabled={!projectName.trim() || !projectClientId || createProject.isPending}
            onClick={() => createProject.mutate({
              name: projectName.trim(),
              clientId: projectClientId,
              summary: projectSummary.trim() || undefined,
              startDate: projectStartDate ? new Date(projectStartDate) : undefined,
              dueDate: projectDueDate ? new Date(projectDueDate) : undefined,
            })}
          >
            {createProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create project
          </Button>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary-400" />
          <h2 className="text-base font-semibold text-text-primary">Projects and progress</h2>
        </div>
        <div className="mt-3 space-y-4">
          {projects?.length ? projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-0">
                <div className="border-b border-border-subtle p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-text-primary">{project.name}</h3>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {isClient ? 'Managed by ARKO' : `Client: ${project.client.name ?? project.client.email}`}
                    </p>
                  </div>
                  {isAdmin ? (
                    <select
                      value={project.status}
                      aria-label={`Status for ${project.name}`}
                      onChange={(event) => updateProject.mutate({
                        id: project.id,
                        status: event.target.value as 'PLANNING' | 'ACTIVE' | 'REVIEW' | 'COMPLETED' | 'ON_HOLD',
                      })}
                      className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold"
                    >
                      <option value="PLANNING">Planning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="REVIEW">In review</option>
                      <option value="ON_HOLD">On hold</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  ) : (
                    <span className="rounded-full bg-primary-500/10 px-2 py-1 text-[10px] font-semibold text-primary-400">
                      {project.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
                {project.summary ? (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">{project.summary}</p>
                ) : (
                  <p className="mt-3 text-sm italic text-text-tertiary">No project brief has been added yet.</p>
                )}
                </div>

                <div className="grid gap-0 divide-y divide-border-subtle md:grid-cols-3 md:divide-x md:divide-y-0">
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Timeline</p>
                    <p className="mt-2 text-sm font-medium text-text-primary">
                      {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not scheduled'}
                    </p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {project.dueDate ? `Target: ${new Date(project.dueDate).toLocaleDateString()}` : 'No target date'}
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Client requests</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{project.requests.length}</p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {project.requests.filter((request) => request.status !== 'RESOLVED').length} currently open
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Project updates</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{project.updates.length}</p>
                    <p className="mt-1 text-xs text-text-tertiary">Recent updates shown below</p>
                  </div>
                </div>

                <div className="border-t border-border-subtle p-5">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-text-tertiary">Progress</span>
                    <span className="font-semibold tabular-nums text-text-primary">
                      {progressDrafts[project.id] ?? project.progress}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-app">
                    <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${progressDrafts[project.id] ?? project.progress}%` }} />
                  </div>
                {isAdmin && (
                  <div className="mt-4 space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progressDrafts[project.id] ?? project.progress}
                      aria-label={`Progress for ${project.name}`}
                      className="min-w-0 flex-1 accent-primary-500"
                      onChange={(event) => setProgressDrafts((current) => ({
                        ...current,
                        [project.id]: Number(event.target.value),
                      }))}
                    />
                    {progressDrafts[project.id] !== undefined && progressDrafts[project.id] !== project.progress && (
                      <Button
                        size="sm"
                        onClick={() => updateProject.mutate({
                          id: project.id,
                          progress: progressDrafts[project.id],
                          ...(progressDrafts[project.id] === 100 ? { status: 'COMPLETED' as const } : {}),
                        })}
                      >
                        Save progress
                      </Button>
                    )}
                    <div className="rounded-xl border border-border-subtle bg-bg-app/40 p-4">
                      <label htmlFor={`project-update-${project.id}`} className="block text-xs font-semibold text-text-primary">
                        Publish a project update
                      </label>
                      <p className="mt-1 text-xs text-text-tertiary">
                        This note will be visible to the client in their dashboard.
                      </p>
                      <textarea
                        id={`project-update-${project.id}`}
                        value={updateDrafts[project.id] ?? ''}
                        onChange={(event) => setUpdateDrafts((current) => ({
                          ...current,
                          [project.id]: event.target.value,
                        }))}
                        placeholder="Summarize completed work, decisions, blockers, or next steps..."
                        rows={3}
                        className="mt-3 w-full resize-none rounded-lg border border-border-subtle bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
                      />
                      <Button
                        size="sm"
                        className="mt-2"
                        disabled={!updateDrafts[project.id]?.trim() || addUpdate.isPending}
                        onClick={() => addUpdate.mutate({
                          projectId: project.id,
                          content: updateDrafts[project.id].trim(),
                        })}
                      >
                        Publish update
                      </Button>
                    </div>
                  </div>
                )}
                </div>
                <div className="grid gap-0 border-t border-border-subtle lg:grid-cols-2 lg:divide-x lg:divide-border-subtle">
                  <div className="p-5">
                    <div className="flex items-center gap-2">
                      <ListTodo className="h-4 w-4 text-primary-400" />
                      <h4 className="text-sm font-semibold text-text-primary">Milestones</h4>
                    </div>
                    <div className="mt-3 space-y-2">
                      {project.milestones.length ? project.milestones.map((milestone) => (
                        <div key={milestone.id} className="flex items-start gap-2 rounded-lg border border-border-subtle p-3">
                          {isAdmin ? (
                            <button
                              type="button"
                              aria-label={milestone.completed ? `Reopen ${milestone.title}` : `Complete ${milestone.title}`}
                              onClick={() => setMilestoneCompleted.mutate({
                                id: milestone.id,
                                completed: !milestone.completed,
                              })}
                              className="mt-0.5 text-primary-400"
                            >
                              {milestone.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                            </button>
                          ) : milestone.completed ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary-400" />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 text-text-tertiary" />
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm ${milestone.completed ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                              {milestone.title}
                            </p>
                            {milestone.description && <p className="mt-1 text-xs text-text-tertiary">{milestone.description}</p>}
                          </div>
                        </div>
                      )) : <p className="text-xs text-text-tertiary">No milestones defined.</p>}
                    </div>
                    {isAdmin && (
                      <div className="mt-3 flex gap-2">
                        <input
                          value={milestoneDrafts[project.id] ?? ''}
                          onChange={(event) => setMilestoneDrafts((current) => ({ ...current, [project.id]: event.target.value }))}
                          placeholder="Add a milestone"
                          className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-card px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
                        />
                        <Button
                          size="sm"
                          disabled={!milestoneDrafts[project.id]?.trim() || addMilestone.isPending}
                          onClick={() => addMilestone.mutate({
                            projectId: project.id,
                            title: milestoneDrafts[project.id].trim(),
                          })}
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="h-4 w-4 text-primary-400" />
                      <h4 className="text-sm font-semibold text-text-primary">Deliverables</h4>
                    </div>
                    <div className="mt-3 space-y-3">
                      {project.deliverables.length ? project.deliverables.map((deliverable) => (
                        <div key={deliverable.id} className="rounded-lg border border-border-subtle p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-text-primary">{deliverable.title}</p>
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-primary-400">
                                {deliverable.status.replaceAll('_', ' ')}
                              </p>
                            </div>
                            {deliverable.url && (
                              <a href={deliverable.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-400 hover:text-primary-300">
                                Open
                              </a>
                            )}
                          </div>
                          {deliverable.feedback && <p className="mt-2 text-xs text-text-tertiary">Feedback: {deliverable.feedback}</p>}
                          {isClient && deliverable.status === 'PENDING_REVIEW' && (
                            <div className="mt-3">
                              <textarea
                                value={feedbackDrafts[deliverable.id] ?? ''}
                                onChange={(event) => setFeedbackDrafts((current) => ({ ...current, [deliverable.id]: event.target.value }))}
                                placeholder="Optional feedback"
                                rows={2}
                                className="w-full resize-none rounded-lg border border-border-subtle bg-card px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
                              />
                              <div className="mt-2 flex gap-2">
                                <Button size="sm" onClick={() => reviewDeliverable.mutate({
                                  id: deliverable.id,
                                  decision: 'APPROVED',
                                  feedback: feedbackDrafts[deliverable.id]?.trim() || undefined,
                                })}>Approve</Button>
                                <Button variant="outline" size="sm" disabled={!feedbackDrafts[deliverable.id]?.trim()} onClick={() => reviewDeliverable.mutate({
                                  id: deliverable.id,
                                  decision: 'REVISION_REQUESTED',
                                  feedback: feedbackDrafts[deliverable.id].trim(),
                                })}>Request revision</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )) : <p className="text-xs text-text-tertiary">No deliverables shared.</p>}
                    </div>
                    {isAdmin && (
                      <div className="mt-3 space-y-2 rounded-lg border border-border-subtle p-3">
                        <input
                          value={deliverableDrafts[project.id]?.title ?? ''}
                          onChange={(event) => setDeliverableDrafts((current) => ({
                            ...current,
                            [project.id]: { title: event.target.value, url: current[project.id]?.url ?? '' },
                          }))}
                          placeholder="Deliverable title"
                          className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
                        />
                        <input
                          type="url"
                          value={deliverableDrafts[project.id]?.url ?? ''}
                          onChange={(event) => setDeliverableDrafts((current) => ({
                            ...current,
                            [project.id]: { title: current[project.id]?.title ?? '', url: event.target.value },
                          }))}
                          placeholder="https://shared-file-or-preview"
                          className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
                        />
                        <Button
                          size="sm"
                          disabled={!deliverableDrafts[project.id]?.title.trim() || addDeliverable.isPending}
                          onClick={() => addDeliverable.mutate({
                            projectId: project.id,
                            title: deliverableDrafts[project.id].title.trim(),
                            url: deliverableDrafts[project.id].url.trim() || undefined,
                          })}
                        >
                          Share for review
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {project.updates.length > 0 && (
                  <div className="border-t border-border-subtle p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Update history</p>
                    <div className="mt-3 space-y-3">
                      {project.updates.map((update) => (
                        <div key={update.id} className="border-l-2 border-primary-500/50 pl-3">
                          <p className="text-sm leading-6 text-text-secondary">{update.content}</p>
                          <p className="mt-1 text-[11px] text-text-tertiary">
                            ARKO · {new Date(update.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {project.activities.length > 0 && (
                  <div className="border-t border-border-subtle p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Project activity</p>
                    <div className="mt-3 space-y-3">
                      {project.activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium capitalize text-text-primary">
                              {activity.action.toLowerCase().replaceAll('_', ' ')}
                            </p>
                            {activity.detail && (
                              <p className="mt-0.5 text-xs leading-5 text-text-secondary">{activity.detail}</p>
                            )}
                            <p className="mt-1 text-[11px] text-text-tertiary">
                              {activity.actorName ?? 'ARKO'} · {new Date(activity.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isAdmin && project.requests.length > 0 && (
                  <div className="space-y-2 border-t border-border-subtle p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Project requests</p>
                    {project.requests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-text-secondary">{request.title}</span>
                        <select
                          value={request.status}
                          onChange={(event) => updateRequest.mutate({
                            id: request.id,
                            status: event.target.value as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED',
                          })}
                          className="rounded-md border border-border-subtle px-2 py-1 text-[10px]"
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )) : (
            <Card className="border-dashed border-border-subtle">
              <CardContent className="py-10 text-center text-sm text-text-tertiary">
                {isClient ? 'Your ARKO team will connect your first project here.' : 'No client projects yet.'}
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {isClient && (
        <section className="rounded-2xl border border-border-subtle bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary-400" />
            <h2 className="text-base font-semibold text-text-primary">Send a request</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={requestTitle}
              onChange={(event) => setRequestTitle(event.target.value)}
              placeholder="Request title"
              className="rounded-lg border border-border-subtle bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
            />
            <select
              value={requestProjectId}
              onChange={(event) => setRequestProjectId(event.target.value)}
              className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm"
            >
              <option value="">General request</option>
              {projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <textarea
            value={requestDescription}
            onChange={(event) => setRequestDescription(event.target.value)}
            placeholder="Describe what you need from the team"
            rows={3}
            className="mt-3 w-full resize-none rounded-lg border border-border-subtle bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
          />
          <Button
            size="sm"
            className="mt-3"
            disabled={!requestTitle.trim() || !requestDescription.trim() || createRequest.isPending}
            onClick={() => createRequest.mutate({
              title: requestTitle.trim(),
              description: requestDescription.trim(),
              projectId: requestProjectId || undefined,
            })}
          >
            {createRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit request
          </Button>
        </section>
      )}

      {(requests?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-base font-semibold text-text-primary">Request history</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-border-subtle bg-card">
            {requests?.map((request) => (
              <div key={request.id} className="flex items-center gap-3 border-b border-border-subtle px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{request.title}</p>
                  <p className="mt-0.5 truncate text-xs text-text-tertiary">
                    {isClient
                      ? request.project?.name ?? 'General request'
                      : `${request.client.name ?? request.client.email} · ${request.project?.name ?? 'General request'}`}
                  </p>
                </div>
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                  {request.taskId ? (
                    <span className="rounded-full bg-primary-500/10 px-2 py-1 text-[10px] font-semibold text-primary-400">Internal task created</span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => convertRequest.mutate({ id: request.id })}>
                      Convert to task
                    </Button>
                  )}
                  <select
                    value={request.status}
                    onChange={(event) => updateRequest.mutate({
                      id: request.id,
                      status: event.target.value as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED',
                    })}
                    className="rounded-md border border-border-subtle px-2 py-1.5 text-xs"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                  </div>
                ) : (
                  <span className="rounded-full bg-primary-500/10 px-2 py-1 text-[10px] font-semibold text-primary-400">
                    {request.status.replace('_', ' ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-text-primary">Portal tools</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-border-subtle bg-card p-4 transition-colors hover:border-primary-500/40"
            >
              <item.icon className="h-5 w-5 text-primary-400" />
              <h3 className="mt-4 text-sm font-semibold text-text-primary">{item.title}</h3>
              <p className="mt-1 text-xs leading-5 text-text-tertiary">{item.description}</p>
              <ArrowRight className="mt-4 h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-1 group-hover:text-primary-400" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
